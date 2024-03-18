import { PluginObj, PluginPass } from '@babel/core';
import { Node, NodePath, VisitNodeObject } from '@babel/traverse';

import { Context } from './context/Context';
import { Define } from './context/Define';
import { Element } from './context/Element';
import { Component } from './context/Component';
import { createContext, handleLabel } from './label';
import { Macro, Options } from './options';
import { getNames } from './syntax/names';
import t from './types';

import type {
  BlockStatement,
  JSXElement,
  LabeledStatement,
  Program
} from '@babel/types';

type Visitor<T extends Node> =
  VisitNodeObject<PluginPass & { context: Context }, T>;

declare namespace Plugin {
  export {
    Component,
    Context,
    Define,
    Element,
    Macro,
    Options,
  };
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
      callback(parent, path.key);
  }
}

const HANDLED = new WeakMap<NodePath, (
  path: NodePath, key: string | number | null
) => void>();

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
      callback(path, path.key);

    for(let p of path.getAncestry()){
      if(p.isLabeledStatement())
        break;

      if(p.isBlockStatement())
        p = p.parentPath!;

      const callback = HANDLED.get(p);
  
      if(!callback)
        break;

      callback(p, p.key);
    }
  }
}

const JSXElement: Visitor<JSXElement> = {
  enter(path, state){
    if(isImplicitReturn(path))
      return;

    const context = createContext(path, false);
    const element = new Element(context, path);
    const { apply } = state.opts as Options;

    getNames(path).forEach((path, name) => {
      const applied = element.use(name);

      if(applied.length && path.isJSXAttribute())
        path.remove();
    });

    if(apply)
      apply(element);
  },
  exit(path, state){
    const { parent } = Context.get(path) as Element;

    if(!(parent instanceof Component) || parent.usedBy.size || parent.empty)
      return;

    const [ inserted ] = path.replaceWith(
      t.jsxElement(
        t.jsxOpeningElement(t.jSXIdentifier("this"), []),
        t.jsxClosingElement(t.jSXIdentifier("this")),
        [path.node]
      )
    )

    const wrapper = new Element(parent, inserted);
    const { apply } = state.opts as Options;

    wrapper.use(parent);

    if(apply)
      apply(wrapper);

    inserted.skip();
  }
}

export function onExit(
  path: NodePath,
  callback: (path: NodePath, key: string | number | null) => void){

  HANDLED.set(path, callback);
}

function isImplicitReturn(path: NodePath<JSXElement>){
  let { node, parentPath: parent } = path;

  if(!parent.isExpressionStatement())
    return false;

  const block = parent.parentPath;

  if(block.isBlockStatement()
  && block.get("body").length == 1
  && block.parentPath.isArrowFunctionExpression())
    block.replaceWith(t.parenthesizedExpression(node));
  else
    parent.replaceWith(t.returnStatement(node));

  path.skip();
  return true;
}