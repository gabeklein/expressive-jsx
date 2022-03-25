import { getContext, StackFrame } from 'context';
import { OUTPUT_NODE } from 'generate/jsx';
import { styleDeclaration } from 'generate/styles';
import { Define, ElementInline } from 'handle/definition';
import { parse } from 'parse/body';
import { containerName } from 'parse/entry';
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
    if(!path.getAncestry().slice(0, 4).find(x => x.isFunction()))
      return;

    if(OUTPUT_NODE.has(path.node))
      return;

    let parent = path.parentPath;
    let context = getContext(path, true);

    if(!$.is(parent, "ExpressionStatement")){
      const target = new ElementInline(context);
      parseJSX(target, path);
      path.replaceWith(
        target.toExpression()
      );
      return;
    }

    while(!$.is(parent.parentPath, [
      "FunctionDeclaration",
      "FunctionExpression",
      "ArrowFunctionExpression"
    ]))
      parent = parent.parentPath;

    const block = parent as unknown as t.Path<t.BlockStatement>;
    const name = containerName(block as any);
    const ambient = new Define(context, name);

    parse(ambient, block);

    const output = ambient.toExpression();

    if(output)
      block.node.body.push(
        $.node("ReturnStatement", { argument: output })
      )
  }
}