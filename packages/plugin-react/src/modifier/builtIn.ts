import {
  identifier,
  isIdentifier,
  isObjectPattern,
  objectPattern,
  objectProperty,
  variableDeclaration,
  variableDeclarator,
} from '@babel/types';
import { Define, DefineElement, Prop } from 'handle';

import type { Identifier } from '@babel/types';
import type { BunchOf } from 'types';

import type { ModifyDelegate } from './delegate';

export function use(
  this: ModifyDelegate,
  ...args: any[]){

  const { target } = this;

  for(const item of args)
    if(typeof item == "string"){
      const mod =
        target.context.elementMod(item);

      if(mod)
        target.applyModifier(mod);
    }
}

export function priority(
  this: ModifyDelegate,
  priority: number){

  const { target } = this;

  if(target instanceof Define)
    target.priority = priority
}

export function css(this: ModifyDelegate){
  debugger;
}

export function forward(this: ModifyDelegate, ...args: any[]){
  const target = this.target;
  const parent = target.context.currentComponent;

  if(!(target instanceof DefineElement))
    throw new Error("Can only forward props to another element");

  if(!parent)
    throw new Error("No parent component found in hierarchy");

  if(!parent.exec)
    throw new Error("Can only apply props from a parent `() => do {}` function!");

  const { params } = parent.exec.node;
  const { statements } = parent;

  const all = args.indexOf("all") + 1;
  const reference = {} as BunchOf<Identifier>;

  if(all || ~args.indexOf("children")){
    const id = reference["children"] = this.identifier("children");
    target.adopt(id);
  }

  for(const prop of ["className", "style"])
    if(all || ~args.indexOf(prop)){
      const id = reference[prop] = this.identifier(prop);
      target.add(
        new Prop(prop, id)
      )
    }

  const properties = Object.entries(reference).map(
    (e) => objectProperty(identifier(e[0]), e[1], false, e[1].name == e[0])
  )

  let props = params[0];

  if(!props)
    props = params[0] = objectPattern(properties);

  else if(isObjectPattern(props))
    props.properties.push(...properties)

  else if(isIdentifier(props))
    statements.unshift(
      variableDeclaration("const", [
        variableDeclarator(objectPattern(properties), props)
      ])
    )
}