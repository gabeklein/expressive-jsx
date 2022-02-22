import { Prop } from 'handle/attributes';
import * as s from 'syntax';

import type * as t from 'syntax/types';
import type { ModifyDelegate } from 'parse/modifiers';
import type { Define } from 'handle/definition';

export function forwardProp(
  this: ModifyDelegate,
  ...propNames: any[]){

  const target = this.target;
  const exec = target.context.currentComponent;

  if(!exec)
    throw new Error("No function-component found in hierarchy");

  const { scope } = exec;
  const properties = getProps(exec);

  for(const key of propNames)
    if(key === "ref")
      forwardRef(target, exec);
    else {
      const _local = uniqueWithin(scope, key);
      const property = s.property(key, _local);
      const prop = new Prop(key, _local);
  
      properties.unshift(property);
      target.add(prop);
    }
}

function forwardRef(
  target: Define,
  component: t.Path<t.Function>
){
  const { node } = component as t.Path<any>;
  const { program } = target.context;

  if(s.assert(node, "FunctionDeclaration"))
    node.type = "FunctionExpression";

  const _ref = uniqueWithin(component.scope, "ref");
  const _forwardRef = program.ensure("$pragma", "forwardRef");
  const _wrapped = s.call(_forwardRef, node);

  component.pushContainer("params", _ref);
  component.replaceWith(_wrapped);

  target.add(new Prop("ref", _ref));
}

function uniqueWithin(scope: t.Scope, name: string){
  return scope.hasBinding(name)
    ? scope.generateUidIdentifier(name)
    : s.identifier(name);
}

function getProps(exec: t.Path<t.Function>){
  const { node } = exec;
  let props = node.params[0];
  
  if(!s.assert(props, "ObjectPattern")){
    const existing = props;
    props = s.pattern([]);

    if(!existing)
      node.params[0] = props;

    else if(s.assert(existing, "Identifier")){
      const { body } = node.body as t.BlockStatement;

      for(const stat of body){
        if(!s.assert(stat, "VariableDeclaration"))
          break;

        for(const { id, init } of stat.declarations)
          if(s.assert(init, "Identifier", { name: existing.name })
          && s.assert(id, "ObjectPattern"))
            return id.properties;
      }

      body.unshift(
        s.declare("const", props, existing)
      );
    }
  }

  return (props as t.ObjectPattern).properties;
}