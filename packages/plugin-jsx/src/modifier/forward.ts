import { Prop } from 'handle/attributes';
import * as t from 'syntax';

import type { DefineElement } from 'handle/definition';
import type { ModifyDelegate } from 'parse/modifiers';
import type { ArrowFunctionExpression, Path, Scope } from 'syntax';

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
    const _wrapped = t.call(_forwardRef, exec.node);

    exec.pushContainer("params", _ref);
    exec.replaceWith(_wrapped);

    target.add(new Prop("ref", _ref));
  }

  function getFromProps(name: string){
    const _key = t.identifier(name);
    const _local = uniqueWithin(scope, name);

    properties.unshift(
      t.objectProperty(_key, _local, false, _local.name == name)
    )

    return _local;
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
      const { statements } = target;

      for(const s of statements){
        if(!t.isVariableDeclaration(s))
          break;

        for(const d of s.declarations)
          if(d.init
          && t.isObjectPattern(d.id)
          && t.isIdentifier(d.init, { name: existing.name }))
            return d.id.properties;
      }

      statements.unshift(
        t.declare("const", props, existing)
      );
    }
  }

  return props.properties;
}