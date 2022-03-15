import { StackFrame } from "context";
import { OUTPUT_NODE } from "generate/jsx";
import { styleDeclaration } from "generate/styles";
import { ElementInline } from "handle/definition";
import { applyModifier, parseJSX } from "parse/jsx";
import { handleDefine } from "parse/labels";
import { getTarget } from "parse/parent";
import * as $ from "syntax";

import type { Visitor } from 'types';
import type * as t from 'syntax/types';

export default () => ({
  manipulateOptions: (options: any, parse: any) => {
    parse.plugins.push("doExpressions", "jsx");
  },
  visitor: {
    Program,
    JSXElement,
    LabeledStatement
  }
})

const Program: Visitor<t.Program> = {
  enter(path, state){
    state.context = StackFrame.create(path, state);
  },
  exit(path, { context, filename }){
    const styleBlock = styleDeclaration(context, filename);

    if(styleBlock)
      path.pushContainer("body", [ styleBlock ]);

    context.program.close();
  }
}

const LabeledStatement: Visitor<t.LabeledStatement> = {
  enter(path){
    if(path.get("body").isFor())
      return;

    const target = getTarget(path);

    handleDefine(target, path);

    path.remove();
  }
}

const JSXElement: Visitor<t.JSXElement> = {
  enter(path){
    if(OUTPUT_NODE.has(path.node)){
      path.skip();
      return;
    }

    const isComponent = $.is(path.parentPath, "ExpressionStatement");
    const ambient = getTarget(path);
    let target = new ElementInline(ambient.context);

    parseJSX(target, path);

    if(isComponent && ambient.containsStyle() && !ambient.isUsed){
      const wrap = new ElementInline(target.context);

      wrap.adopt(target);
      applyModifier(wrap, ambient);

      target = wrap;
    }

    const element = target.toExpression();

    if(isComponent)
      path.parentPath.replaceWith(
        $.node("ReturnStatement", { argument: element })
      )
    else
      path.replaceWith(element);
  }
}