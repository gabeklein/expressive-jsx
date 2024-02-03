import * as t from '@babel/types';

import { CONTEXT, Context, FunctionContext, getContext, ModuleContext } from './context';
import { applyElement, isImplicitReturn } from './elements';
import { handleLabel } from './label';

export type {
  Hub,
  NodePath as Path,
  Scope,
  VisitNodeObject,
  VisitNode
} from '@babel/traverse';

export { t };

import type { PluginObj, PluginPass } from '@babel/core';
import type { NodePath, VisitNodeObject } from '@babel/traverse';
export interface Options {
  macros?: Record<string, (...args: any[]) => any>[];
}

export type Macro = (...args: any[]) => Record<string, any>;

type Visitor<T extends t.Node> =
  VisitNodeObject<PluginPass & { context: Context }, T>;

export default (babel: any) => {
  return <PluginObj>({
    manipulateOptions(options, parse){
      parse.plugins.push("jsx");
    },
    visitor: {
      Program,
      LabeledStatement,
      JSXElement
    }
  })
}

const Program: Visitor<t.Program> = {
  enter(path, state){
    const { macros } = state.opts as Options; 
    const context = new ModuleContext(path);

    context.macros = Object.assign({}, ...macros || []);
  }
}

const IGNORE = new Set();

const LabeledStatement: Visitor<t.LabeledStatement> = {
  enter(path){
    const body = path.get("body");

    if(body.isFor() || body.isWhile()){
      IGNORE.add(path);
      return;
    }

    let parent = path.parentPath;
    let context = CONTEXT.get(parent);

    if(!context){
      parent = parent.parentPath!;

      if(parent.isFunction())
        context = new FunctionContext(parent);
      else
        throw new Error("Context not found");
    }

    let { name } = path.get("label").node;

    handleLabel(context, name, body);
  },
  exit(path){
    if(!IGNORE.has(path))
      path.remove();
  }
}

const JSXElement: Visitor<t.JSXElement> = {
  enter(path){
    if(isImplicitReturn(path))
      return;
    
    const context = getContext(path, false);

    if(!context)
      return;

    applyElement(context, path);
  }
}