import { getContext, StackFrame } from 'context';
import { Status } from 'errors';
import { OUTPUT_NODE } from 'generate/jsx';
import { generateCSS, styleDeclaration } from 'generate/styles';
import { ElementInline } from 'handle/definition';
import { parse } from 'parse/body';
import { parseJSX } from 'parse/jsx';
import * as $ from 'syntax';

import type { PluginObj } from '@babel/core';
import type { Visitor } from 'types';
import type * as t from 'syntax/types';

export default () => <PluginObj>({
  manipulateOptions(options, parse){
    parse.plugins.push("doExpressions", "jsx");
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
    state.context = new StackFrame(path, state);
  },
  exit(path, { context, opts }){
    const { extractCss } = opts as any;
    const stylesheet = generateCSS(context);

    if(stylesheet)
      path.pushContainer("body", [
        extractCss
          ? $.statement($.requires(extractCss(stylesheet)))
          : styleDeclaration(stylesheet, context)
      ]);

    context.program.close();
  }
}

const NODE_HANDLED = new WeakSet<any>();

const JSXElement: Visitor<t.JSXElement | t.JSXFragment> = {
  enter(path){
    if(OUTPUT_NODE.has(path.node))
      return;

    if(!$.is(path.parentPath, "ExpressionStatement")){
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
    const ambient = context.ambient;

    parse(ambient, block);

    const output = ambient.toExpression();
    
    if(!output)
      return;

    const { body } = block.node;

    if(path.parentPath.node == body[0] || !body[0])
      functionNode.body = output;
    else 
      block.node.body.push($.returns(output));

    NODE_HANDLED.add(block.node);
  },
  exit(path){
    if(NODE_HANDLED.has(path.node))
      path.remove();
  }
}