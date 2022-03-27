import { getContext, StackFrame } from 'context';
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
    state.context = new StackFrame(path, state);
  },
  exit(path, { context, filename }){
    const styleBlock = styleDeclaration(context, filename);

    if(styleBlock)
      path.pushContainer("body", [ styleBlock ]);

    context.program.close();
  }
}

const JSXElement: Visitor<t.JSXElement> = {
  enter(path){
    if(OUTPUT_NODE.has(path.node))
      return;

    if(!$.is(path.parentPath, "ExpressionStatement")){
      let context = getContext(path, true);
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

    const block = containerFunction.get("body") as t.Path<t.BlockStatement>;
    const context = getContext(path, true);
    const ambient = context.ambient;

    parse(ambient, block);

    const output = ambient.toExpression();

    if(output)
      block.node.body.push(
        $.node("ReturnStatement", { argument: output })
      )
  },
  exit(path){
    if(OUTPUT_NODE.has(path.node))
      path.remove();
  }
}