import { NodePath } from '@babel/traverse';
import { LabeledStatement } from '@babel/types';

import { Context, getContext } from './context/Context';
import { Contingent } from './context/Contingent';
import { Define } from './context/Define';
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
    context.define[name] =
      new Define(name, context, path);

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

  if(context instanceof Contingent)
    return context.for(key);

  if(context)
    return context;

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

  if(parent.isIfStatement())
    return new Contingent(parent);

  if(required === false)
    return getContext(path);

  throw new Error("Context not found");
}