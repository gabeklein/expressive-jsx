import { NodePath } from '@babel/traverse';
import { LabeledStatement } from '@babel/types';

import { Context } from './context/Context';
import { Define } from './context/Context';
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
    context.define[name] = new Define(name, context, path);
    return;
  }

  if(!body.isExpressionStatement())
    throw parseError(body, "Not an expression", name);

  if(!(context instanceof Define))
    throw parseError(body, "Bad context", name);

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

  if(context instanceof Define){
    if(key === "alternate"){
      let { alternate, parent, name, path } = context;
  
      if(!alternate){
        alternate = new Define("not_" + name, parent, path);
        context.alternate = alternate;
        context.dependant.add(alternate);
      }
  
      return alternate;
    }
  
    return context;
  }

  if(parent.isFunction()){
    const name = getName(parent);
    const context = getContext(parent);
    const component = new Define(name, context, parent);
    const body = parent.get("body");

    component.define["this"] = component;

    onExit(parent, () => {
      if(body.isBlockStatement() && !body.get("body").length)
        body.pushContainer("body", t.expressionStatement(
          t.jsxElement(
            t.jsxOpeningElement(t.jsxIdentifier("this"), [], true), null, [], true
          )
        ));
    });

    return component;
  }

  if(parent.isIfStatement()){
    const test = parent.node.test;
    const name = t.isIdentifier(test) ? test.name : "?";
    const context = createContext(parent) as Define;
    const define = new Define(name, context, parent);

    if(t.isStringLiteral(test)){
      context.dependant.add(define);
      define.selector = context.selector + test.value;
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

function getContext(path: NodePath){
  while(path){
    const context = Context.get(path);

    if(context instanceof Context)
      return context;

    path = path.parentPath!;
  }

  throw new Error("Context not found");
}