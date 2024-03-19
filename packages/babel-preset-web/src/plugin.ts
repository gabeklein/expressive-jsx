import { PluginObj, PluginPass } from '@babel/core';
import { Node, NodePath, VisitNodeObject } from '@babel/traverse';

import { Context } from './context/Context';
import { Define } from './context/Define';
import { Element } from './context/Element';
import { createContext, handleLabel } from './label';
import { Macro, Options } from './options';
import { getNames, isImplicitReturn } from './syntax/jsx';
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
    exit(path.parentPath, path.key);
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

    for(let p of path.getAncestry()){
      if(p.isLabeledStatement())
        break;

      if(p.isBlockStatement())
        p = p.parentPath!;

      if(!exit(p))
        break;
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

    if(!(parent instanceof Define)
    || parent.define.this !== parent
    || parent.usedBy.size
    || parent.empty)
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

type ExitCallback = (path: NodePath, key: string | number | null) => void;

const HANDLED = new WeakMap<NodePath, ExitCallback>();

export function onExit(
  path: NodePath,
  callback: (path: NodePath, key: string | number | null) => void){

  HANDLED.set(path, callback);
}

export function exit(path: NodePath, key?: string | number | null){
  const callback = HANDLED.get(path);

  if(callback){
    callback(path, key || path.key);
    // HANDLED.delete(path);
    return true;
  }

  return false;
}