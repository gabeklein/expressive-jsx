import { Context, getContext } from 'context';
import { Status } from 'errors';
import { OUTPUT_NODE } from 'generate/jsx';
import { ElementInline } from 'handle/definition';
import { parse } from 'parse/block';
import { parseJSX } from 'parse/jsx';
import * as t from 'syntax';

import type { PluginObj } from '@babel/core';
import type { BabelState } from 'context';

type Visitor<T extends t.Node, S extends Context = Context> =
  t.VisitNodeObject<BabelState<S>, T>;

export interface Options {
  // expected
  env: "native" | "web";
  output: "js" | "jsx";
  pragma: "react";
  runtime: string;
  styleMode: "compile" | "inline";
  macros: Record<string, (...args: any[]) => any>[];
  module?: true | string;
  extractCss?: (css: string) => string;
  cssModule?: boolean;

  // optional
  hot?: boolean;
  printStyle?: "pretty";
  externals?: "require" | "import" | false;
}

export default () => <PluginObj>({
  manipulateOptions(options, parse){
    parse.plugins.push("jsx");
  },
  visitor: {
    Program,
    JSXElement,
    JSXFragment: JSXElement
  }
})

const Program: Visitor<t.Program> = {
  enter(path, state){
    Status.currentFile = state.file as any;
    state.context = new Context(path, state);
  },
  exit(path, state){
    state.context.close();
  }
}

const NODE_HANDLED = new WeakSet<any>();

const JSXElement: Visitor<t.JSXElement | t.JSXFragment> = {
  enter(path){
    if(OUTPUT_NODE.has(path.node))
      return;

    if(!path.parentPath.isExpressionStatement()){
      const context = getContext(path, true);
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
    const block = containerFunction.get("body") as t.Path<t.BlockStatement>;
    const context = getContext(path, true);
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