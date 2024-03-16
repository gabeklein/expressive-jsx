import { Context, DefineContext, FunctionContext, ModuleContext } from './context';
import { ElementContext } from './elements';
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
    new ModuleContext(path, state);
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

    const { apply } = state.opts as Options;
    const tag = t.jSXIdentifier("this");
    const node = t.jsxElement(
      t.jsxOpeningElement(tag, []),
      t.jsxClosingElement(tag),
      [path.node]
    );
    const wrapper = new ElementContext(parent, node);

    wrapper.use(parent);

    if(apply)
      apply(wrapper);

    path.replaceWith(node)[0].skip();
  }
}

export function onExit(
  path: NodePath,
  callback: (key: unknown, path: NodePath) => void){

  HANDLED.set(path, callback);
}