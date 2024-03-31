import { NodePath } from '@babel/traverse';
import { Function, IfStatement, LabeledStatement } from '@babel/types';

import { Context } from './context';
import { parseError } from './helper/errors';
import { onExit } from './plugin';
import { parseArgument } from './syntax/arguments';
import { getName } from './syntax/names';
import t from './types';

export function handleLabel(path: NodePath<LabeledStatement>){
  const context = getContext(path);
  const body = path.get("body");
  let { name } = path.node.label;

  if(body.isBlockStatement()){
    context.define[name] = new Context(path, context, name);
    return;
  }

  if(!body.isExpressionStatement())
    throw parseError(body, "Not an expression", name);

  if(!context)
    throw parseError(body, "Missing context", name);

  const args = parseArgument(body);

  try {
    const queue = [{ name, args }];

    while(queue.length){
      const { name, args } = queue.pop()!;
      const macro = context.macros[name];
      const apply = (args: any) => {
        context.props.set(name, args);
      };

      if(!macro){
        apply(args);
        continue;
      }

      const output = macro.apply(context, args);

      if(!output)
        continue;

      if(Array.isArray(output)){
        apply(output);
        continue;
      }

      if(typeof output != "object")
        throw new Error("Invalid modifier output.");

      for(const key in output){
        let args = output[key];

        if(args === undefined)
          continue;

        if(!Array.isArray(args))
          args = [args];

        if(key === name)
          apply(args);
        else
          queue.push({ name: key, args });
      }
    }
  }
  catch(err: unknown){
    throw parseError(body, err, name);
  }
}

export function getContext(path: NodePath): Context {
  let key = path.key;

  while(path = path.parentPath!){
    const context = Context.get(path);

    if(context instanceof Context){
      if(key === "alternate"){
        let { alternate, parent, path } = context;
    
        if(!alternate){
          alternate = new Context(path, parent, "else");
          context.children.add(alternate);
          context.alternate = alternate;
        }
    
        return alternate;
      }
    
      return context;
    }

    if(path.isFunction())
      return createFunctionContext(path);

    if(path.isIfStatement())
      return createIfContext(path);

    key = path.key;
  }

  throw new Error("Context not found");
}

function createFunctionContext(path: NodePath<Function>){
  const name = getName(path);
  const context = getContext(path);
  const component = new Context(path, context, name);
  const body = path.get("body");

  component.define["this"] = component;

  onExit(path, () => {
    if(body.isBlockStatement() && !body.get("body").length)
      body.pushContainer("body", t.expressionStatement(
        t.jsxElement(
          t.jsxOpeningElement(
            t.jsxIdentifier("this"), [], true
          ), null, [], true
        )
      ));
  });

  return component;
}

function createIfContext(path: NodePath<IfStatement>){
  const test = path.node.test;
  const name = t.isIdentifier(test) ? test.name : "?";
  const outer = getContext(path);
  const inner = new Context(path, outer, name);

  if(t.isStringLiteral(test)){
    outer.children.add(inner);
    inner.uid = outer.uid;
    inner.condition = test.value;
  }
  else {
    outer.also.add(inner);
    inner.condition = test;
  }

  onExit(path, (path, key) => {
    if(key == "alternate" || inner.alternate)
      return;

    if(!path.removed)
      path.remove();
  });

  return inner;
}