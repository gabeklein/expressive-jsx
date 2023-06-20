import { Prop } from 'handle/attributes';
import * as $ from 'syntax';

import type * as t from 'syntax/types';
import type { ModifyDelegate } from 'parse/labels';
import type { Define } from 'handle/definition';

export function forwardProp(
  this: ModifyDelegate,
  ...propNames: any[]){

  const target = this.target;
  const exec = (this.body as t.Path<t.Statement>)
    .getAncestry()
    .find(x => x.isFunction()) as t.Path<t.Function>;

  if(!exec)
    throw new Error("No function-component found in hierarchy");

  const { scope } = exec;
  const properties = getProps(exec);

  for(const key of propNames)
    if(key === "ref")
      forwardRef(target, exec);
    else {
      const _local = uniqueWithin(scope, key);
      const property = $.property(key, _local);
      const prop = new Prop(key, _local);
  
      properties.unshift(property);
      target.add(prop);
    }
}

function forwardRef(
  target: Define,
  component: t.Path<t.Function>){

  const { node } = component as t.Path<any>;
  const { program } = target.context;

  if($.is(node, "FunctionDeclaration"))
    node.type = "FunctionExpression";

  const _ref = uniqueWithin(component.scope, "ref");
  const _forwardRef = program.ensure("$pragma", "forwardRef");
  const _wrapped = $.call(_forwardRef, node);

  component.pushContainer("params", _ref);
  component.replaceWith(_wrapped);

  target.add(new Prop("ref", _ref));
}

function uniqueWithin(scope: t.Scope, name: string){
  return scope.hasBinding(name)
    ? scope.generateUidIdentifier(name)
    : $.identifier(name);
}

function getProps(exec: t.Path<t.Function>){
  const { node } = exec;
  let props = node.params[0];
  
  if(!$.is(props, "ObjectPattern")){
    const existing = props;
    props = $.pattern([]);

    if(!existing)
      node.params[0] = props;

    else if($.is(existing, "Identifier")){
      const { body } = node.body as t.BlockStatement;

      for(const stat of body){
        if(!$.is(stat, "VariableDeclaration"))
          break;

        for(const { id, init } of stat.declarations)
          if($.is(init, "Identifier", { name: existing.name })
          && $.is(id, "ObjectPattern"))
            return id.properties;
      }

      body.unshift(
        $.declare("const", props, existing)
      );
    }
  }

  return (props as t.ObjectPattern).properties;
}