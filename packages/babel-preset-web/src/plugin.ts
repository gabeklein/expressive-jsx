import { Context, DefineContext, ModuleContext } from './context';
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
  enter(path){
    const parent = createContext(path, false);
    new ElementContext(parent, path);
  },
  exit(path, { opts }){
    const { apply } = opts as Options;
    const element = Context.get(path) as ElementContext;

    if(apply)
      apply(element);

    let [{ node }, statement, block, within] = path.getAncestry();
    const { component } = element;

    if(!block.isBlockStatement())
      return;

    if(component
    && component.usedBy.size == 0
    && Object.keys(component.styles).length > 0){
      const tag = t.jSXIdentifier("this");

      node = t.jsxElement(
        t.jsxOpeningElement(tag, []),
        t.jsxClosingElement(tag),
        [node]
      )

      const wrapper = new ElementContext(component, node);

      wrapper.use(component);

      if(apply)
        apply(wrapper);
    }
  
    const inserted = block.get("body").length === 1 &&
      within.isArrowFunctionExpression()
      ? block.replaceWith(t.parenthesizedExpression(node))
      : statement.replaceWith(t.returns(node));
  
    inserted[0].skip();
  }
}

export function onExit(
  path: NodePath, callback: (key: unknown, path: NodePath) => void){

  HANDLED.set(path, callback);
}