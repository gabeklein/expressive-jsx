import { Prop } from 'handle/attributes';

import * as t from 'syntax';
import type { ModifyDelegate } from 'parse/labels';
import type { Define } from 'handle/definition';

function forwardProp(
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
      const property = t.property(key, _local);
      const prop = new Prop(key, _local);
  
      properties.unshift(property);
      target.add(prop);
    }
}

function forwardRef(
  target: Define,
  component: t.Path<t.Function>){

  const { node } = component as t.Path<any>;
  const { file } = target.context;

  if(t.isFunctionDeclaration(node))
    (node as any).type = "FunctionExpression";

  const _ref = uniqueWithin(component.scope, "ref");
  const _forwardRef = file.ensure("$pragma", "forwardRef");
  const _wrapped = t.call(_forwardRef, node);

  component.pushContainer("params", _ref);
  component.replaceWith(_wrapped);

  target.add(new Prop("ref", _ref));
}

function uniqueWithin(scope: t.Scope, name: string){
  return scope.hasBinding(name)
    ? scope.generateUidIdentifier(name)
    : t.identifier(name);
}

function getProps(exec: t.Path<t.Function>){
  const { node } = exec;
  let props = node.params[0];
  
  if(!t.isObjectPattern(props)){
    const existing = props;
    props = t.objectPattern([]);

    if(!existing)
      node.params[0] = props;

    else if(t.isIdentifier(existing)){
      const { body } = node.body as t.BlockStatement;

      for(const stat of body){
        if(!t.isVariableDeclaration(stat))
          break;

        for(const { id, init } of stat.declarations)
          if(t.isIdentifier(init, { name: existing.name })
          && t.isObjectPattern(id))
            return id.properties;
      }

      body.unshift(
        t.declare("const", props, existing)
      );
    }
  }

  return props.properties;
}

function applyAlso(this: ModifyDelegate, ...names: any[]){
  const { target } = this;

  for(const name of names)
    if(typeof name == "string"){
      const mod = target.getModifier(name);

      if(mod)
        target.use(mod);
    }
}

function setPriority(this: ModifyDelegate, priority: number){
  this.target.priority = priority;
}

export const builtIn = {
  forward: forwardProp,
  priority: setPriority,
  use: applyAlso
}