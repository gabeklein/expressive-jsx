import { Scope } from '@babel/traverse';
import {
  callExpression,
  Identifier,
  identifier,
  isIdentifier,
  isObjectPattern,
  objectPattern,
  objectProperty,
  Statement,
  stringLiteral,
  variableDeclaration,
  variableDeclarator,
} from '@babel/types';
import {
  AttributeBody,
  ComponentExpression,
  ContingentModifier,
  ElementInline,
  ElementModifier,
  ExplicitStyle,
  Modifier,
  Prop,
} from 'handle';
import { Arguments } from 'parse';
import { BunchOf, ModiferBody, ModifyAction } from 'types';

type ModTuple = [string, ModifyAction, any[] | ModiferBody ];

const { isArray } = Array;

export function applyModifier(
  initial: string,
  recipient: Modifier | ElementInline,
  input: ModiferBody){

  const handler = recipient.context.propertyMod(initial);

  const totalOutput = {
    props: {} as BunchOf<any>,
    style: {} as BunchOf<any>
  };

  let i = 0;
  let stack = [
    [ initial, handler, input ] as ModTuple
  ];

  do {
    const { output } = new ModifyDelegate(recipient, ...stack[i]);

    if(!output){
      i++;
      continue;
    }

    Object.assign(totalOutput.style, output.style);
    Object.assign(totalOutput.props, output.props);

    const next = output.attrs;
    const pending = [] as ModTuple[];

    if(next)
    for(const named in next){
      let input = next[named];
      let { context } = recipient;

      if(input == null) continue;

      if(named == initial){
        let found;
        do {
          found = context.hasOwnPropertyMod(named);
          context = context.parent;
        }
        while(!found);
      }

      pending.push([
        named,
        context.propertyMod(named),
        [].concat(input)
      ])
    }

    if(pending.length){
      stack = [...pending, ...stack.slice(i+1)];
      i = 0;
    }
    else i++
  }
  while(i in stack)

  for(const name in totalOutput.style){
    let item = totalOutput.style[name];

    if(isArray(item)){
      const [ callee, ...args ] = item;
      item = `${callee}(${args.join(" ")})`
    }

    recipient.insert(new ExplicitStyle(name, item))
  }
}

export class ModifyDelegate {
  arguments?: Array<any>
  priority?: number;
  done?: true;
  output = {} as BunchOf<any>;
  body?: ModiferBody;

  constructor(
    public target: AttributeBody,
    public name: string,
    transform: ModifyAction = propertyModifierDefault,
    input: any[] | ModiferBody){

    if(isArray(input))
      this.arguments = input;
    else {
      this.arguments = Arguments.Parse(input);
      this.body = input;
    }

    const output = transform.apply(this, this.arguments)

    if(!output || this.done) return

    this.assign(output);
  }

  assign(data: any){
    for(const field in data){
      let value = data[field];
      if(field in this.output)
        Object.assign(this.output[field], value)
      else this.output[field] = value
    }
  }

  forwardFromParentProps(args: any[]){
    let target = this.target;
    let parent = target.context.currentComponent;

    if(!(target instanceof ElementInline))
      throw new Error("Can only forward props to another element");

    if(!parent)
      throw new Error("No parent component found in hierarchy");

      const { exec } = parent;

    if(!exec)
      throw new Error("Can only apply props from a parent `() => do {}` function!");

    const uid = (name: string) => identifier(ensureUID(exec.context.scope, name));

    let all = args.indexOf("all") + 1;
    const reference = {} as BunchOf<Identifier>;

    if(all || ~args.indexOf("children")){
      const id = reference["children"] = uid("children");
      target.adopt(id);
    }

    for(const prop of ["className", "style"])
      if(all || ~args.indexOf(prop)){
        const id = reference[prop] = uid(prop);
        target.insert(
          new Prop(prop, id)
        )
      }

    applyToParentProps(parent, reference);
  }

  setContingent(
    contingent: string,
    priority?: number,
    usingBody?: Statement){

    const { target } = this;
    const mod = new ContingentModifier(
      this.target.context,
      this.target as any,
      contingent
    )

    mod.priority = priority || this.priority;
    mod.parseNodes(usingBody || this.body!);

    if(target instanceof ElementInline)
      target.modifiers.push(mod);

    else if(target instanceof ElementModifier)
      target.applicable.push(mod);

    else if(
      target instanceof ContingentModifier && 
      target.anchor instanceof ElementInline
    )
      target.anchor.modifiers.push(mod);

    return mod;
  }
}

function ensureUID(
  scope: Scope,
  name: string = "temp"){

  name = name.replace(/^_+/, "").replace(/[0-9]+$/g, "");
  let uid;
  let i = 0;

  do {
    uid = name + (i > 1 ? i : "");
    i++;
  }
  while (
    scope.hasBinding(uid) ||
    scope.hasGlobal(uid) ||
    scope.hasReference(uid)
  );

  const program = scope.getProgramParent() as any;
  program.references[uid] = true;
  program.uids[uid] = true;
  return uid;
}

function applyToParentProps(
  parent: ComponentExpression,
  assignments: BunchOf<Identifier>){

  const { exec } = parent;

  if(!exec)
    throw new Error("Can only apply props from a parent `() => do {}` function!");

  const { node } = exec;

  const properties = Object.entries(assignments).map(
    (e) => objectProperty(identifier(e[0]), e[1], false, e[1].name == e[0])
  )

  let props = node.params[0];

  if(!props)
    props = node.params[0] = objectPattern(properties);
  else if(isObjectPattern(props))
    props.properties.push(...properties)
  else if(isIdentifier(props))
    parent.statements.unshift(
      variableDeclaration("const", [
        variableDeclarator(objectPattern(properties), props)
      ])
    )
}

function propertyModifierDefault(
  this: ModifyDelegate){

  const args = this.arguments!.map(arg => {
    const { value, requires } = arg;

    if(value)
      return value;
    else if(requires)
      return requireExpression(requires);
    else
      return arg;
  })

  const output =
    args.length == 1 || typeof args[0] == "object"
      ? args[0]
      : Array.from(args).join(" ")

  return {
    style: {
      [this.name]: output
    }
  }
}

export function requireExpression(from: string){
  const argument = 
    typeof from == "string"
      ? stringLiteral(from)
      : from

  return callExpression(
    identifier("require"), [argument]
  )
}