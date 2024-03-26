import { PluginObj, PluginPass } from '@babel/core';
import { Node, NodePath, VisitNodeObject } from '@babel/traverse';

import { Context } from './context/Context';
import { createContext, getContext, handleLabel } from './label';
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

type Visitor<T extends Node> =
  VisitNodeObject<State, T>;

declare namespace Plugin {
  export {
    Context,
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

const SCOPE = new WeakMap<NodePath, Set<Context>>();

const JSXElement: Visitor<JSXElement> = {
  enter(path, state){
    if(fixImplicitReturn(path))
      return;

    const parent = path.parentPath;
    const scope = new Set<Context>();
    const using = new Set<Context>()

    SCOPE.set(path, scope);

    if(parent.isJSXElement())
      for(const ctx of SCOPE.get(parent)!)
        scope.add(ctx);
    else
      scope.add(createContext(parent));

    getNames(path).forEach((path, name) => {
      let used = false;

      for(const context of scope)
        context.get(name).forEach((ctx) => {
          ctx.usedBy.add(path);
          scope.add(ctx);
          using.add(ctx);
          used = true;
        });

      if(used && path.isJSXAttribute())
        path.remove();
    });

    const { apply } = state.opts as Options;

    if(apply)
      apply(path, using);
  },
  exit(path, state){
    const parent = getContext(path);

    if(!(parent instanceof Context)
    || parent.define.this !== parent
    || parent.props.size === 0
    || parent.usedBy.size)
      return;

    const { apply } = state.opts as Options;
    const [ inserted ] = path.replaceWith(
      t.jsxElement(
        t.jsxOpeningElement(t.jSXIdentifier("this"), []),
        t.jsxClosingElement(t.jSXIdentifier("this")),
        [path.node]
      )
    )

    if(apply)
      apply(inserted, [parent]);

    inserted.skip();
  }
}

type ExitCallback =
  (path: NodePath, key: string | number | null) => void;

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