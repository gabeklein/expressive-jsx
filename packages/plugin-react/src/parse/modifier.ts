import { callExpression, identifier, Statement, stringLiteral } from '@babel/types';
import { AttributeBody, ContingentModifier, ElementInline, ElementModifier, ExplicitStyle, Modifier, Prop } from 'handle';
import { Arguments } from 'parse';
import { BunchOf, ModiferBody, ModifyAction } from 'types';

type ModTuple = [string, ModifyAction, any[] | ModiferBody ];

export function applyModifier(
  initial: string,
  recipient: Modifier | ElementInline,
  input: ModiferBody){

  const handler = recipient.context.propertyMod(initial);
  const styles = {} as BunchOf<ExplicitStyle>;
  // const props = {} as BunchOf<Attribute>;

  let i = 0;
  let stack: ModTuple[] = [[ initial, handler, input ]];

  do {
    const next = stack[i];
    const output = new ModifyDelegate(recipient, ...next);

    Object.assign(styles, output.styles);
    // Object.assign(props, output.props);

    const recycle = output.attrs;
    const pending = [] as ModTuple[];

    if(recycle)
      for(const named in recycle){
        let input = recycle[named];

        if(input == null)
          continue;

        const useSuper = named === initial;
        const handler = recipient.context.findPropertyMod(named, useSuper);

        pending.push([named, handler, input]);
      }

    if(pending.length){
      stack = [...pending, ...stack.slice(i+1)];
      i = 0;
    }
    else i++
  }
  while(i in stack)

  for(const name in styles)
    recipient.insert(styles[name]);
}

export class ModifyDelegate {
  arguments?: Array<any>
  priority?: number;
  done?: true;
  body?: ModiferBody;

  attrs = {} as BunchOf<any[]>;
  styles = {} as BunchOf<ExplicitStyle>;
  props = {} as BunchOf<Prop>;

  constructor(
    public target: AttributeBody,
    public name: string,
    transform: ModifyAction,
    input: any[] | ModiferBody){

    let important = false;
    let args: any[];

    if(Array.isArray(input))
      args = input;
    else {
      args = Arguments.Parse(input);
      this.body = input;
    }

    if(args[args.length - 1] == "!important"){
      important = true;
      args.pop();
    }

    this.arguments = args;

    if(!transform)
      transform = propertyModifierDefault;

    const output = transform.apply(this, args);

    if(!output || this.done)
      return;

    const { attrs, style } = output;

    if(style)
      for(const name in style){
        let item = style[name];
        this.styles[name] = 
          new ExplicitStyle(name, item, important);
      }

    if(attrs)
      for(const name in attrs){
        let args: any[] = attrs[name];

        if(!Array.isArray(args))
          args = [args];

        if(important)
          args.push("!important");
          
        this.attrs[name] = args;
      }
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
      target.alsoApplies.push(mod);

    else if(
      target instanceof ContingentModifier && 
      target.anchor instanceof ElementInline
    )
      target.anchor.modifiers.push(mod);

    return mod;
  }
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