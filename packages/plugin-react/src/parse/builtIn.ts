import { Scope } from '@babel/traverse';
import {
  Identifier,
  identifier,
  isIdentifier,
  isObjectPattern,
  objectPattern,
  objectProperty,
  variableDeclaration,
  variableDeclarator,
} from '@babel/types';

import { ComponentExpression, ElementInline, Modifier, Prop } from 'handle';
import { BunchOf } from 'types';

import { ModifyDelegate } from './modifier';

export function use(
  this: ModifyDelegate,
  ...args: any[]){

  const { target } = this;
  for(const item of args){
    if(typeof item !== "string")
      continue;

    const mod = target.context.elementMod(item);
    if(!mod)
      continue;

    if(target instanceof ElementInline)
      target.modifiers.push(mod);
    else
    if(target instanceof Modifier){
      target.applicable.push(mod);
    }
  }
}

export function priority(
  this: ModifyDelegate,
  priority: number){

  const { target } = this;
  if(target instanceof Modifier)
    target.priority = priority
}

export function css(this: ModifyDelegate){
  debugger;
}

export function forward(this: ModifyDelegate, ...args: any[]){
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

function ensureUID(
  scope: Scope,
  name: string = "temp"){

  let uid;
  let i = 0;

  name = name
    .replace(/^_+/, "")
    .replace(/[0-9]+$/g, "");

  do {
    uid = name;
    if(i > 1)
      name = name + i;
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