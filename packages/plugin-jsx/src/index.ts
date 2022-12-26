import { getContext, StackFrame } from 'context';
import { Status } from 'errors';
import { OUTPUT_NODE } from 'generate/jsx';
import { styleDeclaration } from 'generate/styles';
import { ElementInline } from 'handle/definition';
import { parse } from 'parse/body';
import { parseJSX } from 'parse/jsx';
import * as $ from 'syntax';

import type { Visitor } from 'types';
import type * as t from 'syntax/types';

export default () => ({
  manipulateOptions: (options: any, parse: any) => {
    parse.plugins.push("doExpressions", "jsx");
  },
  visitor: {
    Program,
    JSXElement,
    JSXFragment: JSXElement,
    DoExpression
  }
})

const DoExpression: Visitor<t.DoExpression> = {
  enter(path){
    path.replaceWith(path.get("body").node)
  }
}

const Program: Visitor<t.Program> = {
  enter(path, state){
    Status.currentFile = state.file as any;
    state.context = new StackFrame(path, state);
  },
  exit(path, { context }){
    const styleBlock = styleDeclaration(context);

    if(styleBlock)
      path.pushContainer("body", [ styleBlock ]);

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

    const block = containerFunction.get("body") as t.Path<t.BlockStatement>;
    const context = getContext(path, true);
    const ambient = context.ambient;

    parse(ambient, block);

    const output = ambient.toExpression();
    const { body } = block.node;
    
    if(!output)
      return;

    NODE_HANDLED.add(block.node);

    if(path.parentPath.node == body[0] || !body[0])
      containerFunction.node.body = output;
    else 
      block.node.body.push($.returns(output));
  },
  exit(path){
    if(NODE_HANDLED.has(path.node))
      path.remove();
  }
}