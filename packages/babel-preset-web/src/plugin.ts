import { PluginObj, PluginPass } from '@babel/core';
import { Node, NodePath, VisitNodeObject } from '@babel/traverse';

import { Context } from './context/Context';
import { Element } from './context/Element';
import { createContext, handleLabel } from './label';
import { Macro, Options } from './options';
import { fixImplicitReturn, getNames } from './syntax/jsx';
import t from './types';

import type {
  BlockStatement,
  JSXElement,
  LabeledStatement,
  Program
} from '@babel/types';

export type State = PluginPass & {
  context: Context;
  opts: Options;
}

type Visitor<T extends Node> = VisitNodeObject<State, T>;

declare namespace Plugin {
  export {
    Context,
    Element,
    Macro,
    Options,
  };
}

function Plugin(_compiler: any, options: Options): PluginObj {
  if(!options.apply)
    throw new Error(`Plugin has not defined an apply method.`);
  
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
    new Context(path, state);
  }
}

const BlockStatement: Visitor<BlockStatement> = {
  exit(path){
    exit(path, path.key);
  }
}

const LabeledStatement: Visitor<LabeledStatement> = {
  enter(path){
    const body = path.get("body");

    if(body.isFor() || body.isWhile())
      return;

    handleLabel(path);
    onExit(path, () => {
      if(!path.removed)
        path.remove();
    });
  },
  exit(path){
    exit(path, path.key);

    for(const p of path.getAncestry()){
      if(p.isLabeledStatement())
        break;

      if(!exit(p))
        break;
    }
  }
}

const ELEMENTS = new WeakMap<NodePath, Element>();

const JSXElement: Visitor<JSXElement> = {
  enter(path, state){
    if(fixImplicitReturn(path))
      return;

    const context = path.parentPath.isJSXElement()
      ? ELEMENTS.get(path.parentPath)!
      : createContext(path, false);

    const element = new Element(path, context);

    getNames(path).forEach((path, name) => {
      const applied = element.use(name);

      if(applied.size && path.isJSXAttribute())
        path.remove();
    });

    const { apply } = state.opts as Options;

    if(apply)
      apply(path, element.using);

    ELEMENTS.set(path, element);
  },
  exit(path, state){
    const { parent } = ELEMENTS.get(path)!;

    if(!(parent instanceof Context)
    || parent.define.this !== parent
    || parent.props.size === 0
    || parent.usedBy.size)
      return;

    const [ inserted ] = path.replaceWith(
      t.jsxElement(
        t.jsxOpeningElement(t.jSXIdentifier("this"), []),
        t.jsxClosingElement(t.jSXIdentifier("this")),
        [path.node]
      )
    )

    const wrapper = new Element(inserted, parent);
    const { apply } = state.opts as Options;

    wrapper.use(parent);

    if(apply)
      apply(inserted, wrapper.using);

    inserted.skip();
  }
}

type ExitCallback = (path: NodePath, key: string | number | null) => void;

const HANDLED = new WeakMap<NodePath, ExitCallback>();

export function onExit(path: NodePath, callback: ExitCallback){
  HANDLED.set(path, callback);
}

export function exit(path: NodePath, key?: string | number | null){
  const callback = HANDLED.get(path);

  if(callback){
    callback(path, key || path.key);
    // HANDLED.delete(path);
    return true;
  }

  if(path.isBlockStatement())
    return exit(path.parentPath!);

  return false;
}