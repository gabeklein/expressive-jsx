import * as s from 'syntax';
import { Prop } from 'handle/attributes';

import type * as t from 'syntax/types';
import type { DefineElement } from 'handle/definition';
import type { ModifyDelegate } from 'parse/modifiers';

export function forwardProp(
  this: ModifyDelegate,
  ...propNames: any[]){

  const target = this.target;
  const parent = target.context.currentComponent;

  if(!parent)
    throw new Error("No parent component found in hierarchy");

  const { exec } = parent;

  if(!exec)
    throw new Error("Can only apply props from a parent `() => do {}` function!");

  const { scope } = exec;
  const properties = getProps(parent, exec);

  for(const key of ["className", "style"])
    if(propNames.includes(key))
      target.add(
        new Prop(key, getFromProps(key))
      )

  if(propNames.includes("ref")){
    const { program } = target.context;
    const _ref = uniqueWithin(scope, "ref");
    const _forwardRef = program.ensure("$pragma", "forwardRef");
    const _wrapped = s.call(_forwardRef, exec.node);

    exec.pushContainer("params", _ref);
    exec.replaceWith(_wrapped);

    target.add(new Prop("ref", _ref));
  }

  function getFromProps(name: string){
    const _local = uniqueWithin(scope, name);

    properties.unshift(
      s.property(name, _local)
    )

    return _local;
  }
}

function uniqueWithin(scope: t.Scope, name: string){
  return scope.hasBinding(name)
    ? scope.generateUidIdentifier(name)
    : s.id(name);
}

function getProps(
  target: DefineElement,
  exec: t.Path<t.ArrowFunctionExpression>){

  const { node } = exec;
  let props = node.params[0];
  
  if(!props || props.type !== "ObjectPattern"){
    const existing = props;
    props = s.pattern([]);

    if(!existing)
      node.params[0] = props;

    else if(s.assert(existing, "Identifier")){
      const { statements } = target;

      for(const stat of statements){
        if(!s.assert(stat, "VariableDeclaration"))
          break;

        for(const { id, init } of stat.declarations)
          if(s.assert(init, "Identifier", { name: existing.name })
          && s.assert(id, "ObjectPattern"))
            return id.properties;
      }

      statements.unshift(
        s.declare("const", props, existing)
      );
    }
  }

  return props.properties;
}