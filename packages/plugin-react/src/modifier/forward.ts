import * as t from '@babel/types';
import { Prop } from 'handle';
import { _call } from 'syntax';

import type { NodePath as Path, Scope } from '@babel/traverse';
import type { ArrowFunctionExpression } from '@babel/types';
import type { DefineElement } from 'handle';
import type { ModifyDelegate } from './delegate';

export function forward(this: ModifyDelegate, ...args: any[]){
  const target = this.target;
  const parent = target.context.currentComponent;

  if(!parent)
    throw new Error("No parent component found in hierarchy");

  const { exec } = parent;

  if(!exec)
    throw new Error("Can only apply props from a parent `() => do {}` function!");

  const { scope } = exec;
  const properties = getProps(target, exec);

  for(const key of ["className", "style"])
    if(args.includes(key))
      target.add(
        new Prop(key, getFromProps(key))
      )

  if(args.includes("ref")){
    const ref = uniqueWithin(scope, "ref");
    const util = target.context.Scope.ensure("$pragma", "forwardRef");

    exec.pushContainer("params", ref);
    exec.replaceWith(_call(util, exec.node));
    target.add(new Prop("ref", ref));
  }

  function getFromProps(name: string){
    const id = uniqueWithin(scope, name);

    properties.push(
      t.objectProperty(t.identifier(name), id, false, id.name == name)
    )

    return id;
  }
}

function uniqueWithin(scope: Scope, name: string){
  return scope.hasBinding(name)
    ? scope.generateUidIdentifier(name)
    : t.identifier(name);
}

function getProps(
  target: DefineElement,
  exec: Path<ArrowFunctionExpression>){

  const { node } = exec;
  let props = node.params[0];
  
  if(!t.isObjectPattern(props)){
    const existing = props;
    props = t.objectPattern([]);

    if(!existing)
      node.params[0] = props;

    else if(t.isIdentifier(existing)){
      const init = t.variableDeclaration("const", [
        t.variableDeclarator(props, existing)
      ]);

      target.statements.push(init);
    }
  }

  return props.properties;
}