import { NodePath } from '@babel/traverse';
import { LabeledStatement } from '@babel/types';

import { Context } from './context/Context';
import { parseError } from './helper/errors';
import { onExit } from './plugin';
import { parseArgument } from './syntax/arguments';
import { getName } from './syntax/names';
import t from './types';

export function handleLabel(path: NodePath<LabeledStatement>){
  const context = createContext(path);
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
    context.macro(name, args);
  }
  catch(err: unknown){
    throw parseError(body, err, name);
  }
}

export function createContext(path: NodePath, required?: boolean){
  let parent = path.parentPath!;
  let key = path.key;

  while(
    parent.isBlockStatement() ||
    parent.isReturnStatement() ||
    parent.isExpressionStatement() ||
    parent.isParenthesizedExpression()){

    parent = parent.parentPath!;
    key = parent.key;
  }

  const context = Context.get(parent);

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

  if(parent.isFunction()){
    const name = getName(parent);
    const context = getContext(parent);
    const component = new Context(parent, context, name);
    const body = parent.get("body");

    component.define["this"] = component;

    onExit(parent, () => {
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

  if(parent.isIfStatement()){
    const test = parent.node.test;
    const name = t.isIdentifier(test) ? test.name : "?";
    const context = createContext(parent) as Context;
    const define = new Context(parent, context, name);

    if(t.isStringLiteral(test)){
      context.children.add(define);
      define.uid = context.uid;
      define.condition = test.value;
    }
    else {
      context.also.add(define);
      define.condition = test;
    }

    onExit(parent, (path, key) => {
      if(key == "alternate" || define.alternate)
        return;

      if(!path.removed)
        path.remove();
    });

    return define;
  }

  if(required === false)
    return getContext(path);

  throw new Error("Context not found");
}

export function getContext(path: NodePath){
  while(path){
    const context = Context.get(path);

    if(context instanceof Context)
      return context;

    path = path.parentPath!;
  }

  throw new Error("Context not found");
}