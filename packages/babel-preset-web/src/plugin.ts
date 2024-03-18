import { Context } from './context/Context';
import { DefineContext } from './context/DefineContext';
import { FunctionContext } from './context/FunctionContext';
import { ElementContext } from './context/ElementContext';
import { createContext, handleLabel } from './label';
import { Macro, Options } from './options';
import { t } from './types';

import type { PluginObj, PluginPass } from '@babel/core';
import type { Node, NodePath, VisitNodeObject } from '@babel/traverse';
import type { BlockStatement, JSXElement, LabeledStatement, Program } from '@babel/types';

type Visitor<T extends Node> =
  VisitNodeObject<PluginPass & { context: Context }, T>;

declare namespace Plugin {
  export { Options };
  export { Macro };
  export { DefineContext }
}

function Plugin(){
  return <PluginObj>({
    manipulateOptions(_options, parse){
      parse.plugins.push("jsx");
    },
    visitor: {
      Program,
      LabeledStatement,
      BlockStatement,
      JSXElement
    }
  })
}

export default Plugin;

const Program: Visitor<Program> = {
  enter(path, state){
    new Context(state.opts, path);
  }
}

const BlockStatement: Visitor<BlockStatement> = {
  exit(path){
    const parent = path.parentPath!;
    const callback = HANDLED.get(parent);
  
    if(callback)
      callback(path.key, parent);
  }
}

const HANDLED = new WeakMap<NodePath, (key: unknown, path: NodePath) => void>();

const LabeledStatement: Visitor<LabeledStatement> = {
  enter(path){
    const body = path.get("body");

    if(body.isFor() || body.isWhile())
      return;

    handleLabel(path);
    HANDLED.set(path, () => {
      !path.removed && path.remove();
    });
  },
  exit(path){
    const callback = HANDLED.get(path);
  
    if(callback)
      callback(path.key, path);

    for(let p of path.getAncestry()){
      if(p.isLabeledStatement())
        break;

      if(p.isBlockStatement())
        p = p.parentPath!;

      const callback = HANDLED.get(p);
  
      if(!callback)
        break;

      callback(p.key, p);
    }
  }
}

const JSXElement: Visitor<JSXElement> = {
  enter(path, state){
    let { node, parentPath: parent } = path;

    if(parent.isExpressionStatement()){
      const block = parent.parentPath;

      if(block.isBlockStatement()
      && block.get("body").length == 1
      && block.parentPath.isArrowFunctionExpression()){
        block.replaceWith(t.parenthesizedExpression(node));
      }
      else {
        parent.replaceWith(t.returnStatement(node));
      }

      path.skip();
      return;
    }

    const context = createContext(path, false);

    const element = new ElementContext(context, path);
    const { apply } = state.opts as Options;

    if(apply)
      apply(element);
  },
  exit(path, state){
    const { parent } = Context.get(path) as ElementContext;

    if(!(parent instanceof FunctionContext) || parent.usedBy.size || parent.empty)
      return;

    const [ inserted ] = path.replaceWith(
      t.jsxElement(
        t.jsxOpeningElement(t.jSXIdentifier("this"), []),
        t.jsxClosingElement(t.jSXIdentifier("this")),
        [path.node]
      )
    )

    const wrapper = new ElementContext(parent, inserted);
    const { apply } = state.opts as Options;

    wrapper.use(parent);

    if(apply)
      apply(wrapper);

    inserted.skip();
  }
}

export function onExit(
  path: NodePath,
  callback: (key: unknown, path: NodePath) => void){

  HANDLED.set(path, callback);
}