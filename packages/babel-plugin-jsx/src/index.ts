import { Context } from 'context';
import { Status } from 'errors';
import { OUTPUT_NODE } from 'generate/jsx';
import { ElementInline } from 'handle/definition';
import { parse } from 'parse/block';
import { parseJSX } from 'parse/jsx';
import { t } from 'syntax';

import type * as $ from 'types';
import type { PluginObj } from '@babel/core';
import type { BabelState } from 'context';

type Visitor<T extends $.Node, S extends Context = Context> =
  $.VisitNodeObject<BabelState<S>, T>;

export type { ModifyDelegate } from 'parse/labels';
export type { Context } from 'context';

export { t } from 'syntax';
export { hash, pascalToDash } from 'utility';
export { Style, Prop } from 'handle/attributes';
export { Define, DefineVariant } from 'handle/definition';

export interface Options {
  // expected
  env?: "native" | "web";
  output?: "js" | "jsx";
  pragma?: "react";
  styleMode?: "compile" | "inline";
  macros?: Record<string, (...args: any[]) => any>[];
  module?: true | string;
  extractCss?: (css: string) => string;
  cssModule?: boolean;

  // optional
  hot?: boolean;
  printStyle?: "pretty";
  externals?: "require" | "import" | false;
}

export default (babel: any) => {
  Object.assign(t, babel.types);

  return <PluginObj>({
    manipulateOptions(options, parse){
      parse.plugins.push("jsx");
    },
    visitor: {
      Program,
      JSXElement,
      JSXFragment: JSXElement
    }
  })
}

const Program: Visitor<$.Program> = {
  enter(path, state){
    Status.currentFile = state.file as any;
    state.context = new Context(path, state);
  },
  exit(_path, state){
    state.context.file.close();
  }
}

const NODE_HANDLED = new WeakSet<any>();

const JSXElement: Visitor<$.JSXElement | $.JSXFragment> = {
  enter(path){
    if(OUTPUT_NODE.has(path.node))
      return;

    if(!path.parentPath.isExpressionStatement()){
      const context = Context.get(path, true);
      const target = new ElementInline(context);
      parseJSX(target, path);
      path.replaceWith(
        target.toExpression()
      );
      return;
    }

    const ancestry = path.getAncestry();
    let containerFunction;

    for(const item of ancestry){
      if(item.isLabeledStatement())
        break;
      if(item.isFunction()){
        containerFunction = item;
        break
      }
    }

    if(!containerFunction)
      return;

    NODE_HANDLED.add(path.node);

    const functionNode = containerFunction.node;
    const block = containerFunction.get("body") as $.Path<$.BlockStatement>;
    const context = Context.get(path, true);
    const { define } = context;

    parse(define, block);

    const output = define.toExpression();
    
    if(!output)
      return;

    const { body } = block.node;

    if(path.parentPath.node == body[0] || !body[0])
      functionNode.body = output;
    else 
      block.node.body.push(t.returns(output));

    NODE_HANDLED.add(block.node);
  },
  exit(path){
    if(NODE_HANDLED.has(path.node))
      path.remove();
  }
}