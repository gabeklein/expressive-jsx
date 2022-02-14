import { StackFrame } from 'context';
import { OUTPUT_NODE } from 'generate/jsx';
import { styleDeclaration } from 'generate/styles';
import { DefineElement } from 'handle/definition';
import { parse } from 'parse/body';
import { addElementFromJSX } from 'parse/jsx';
import { getName } from 'parse/labels';
import * as s from 'syntax';

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
    const key = getName(path);
    const body = path.get("body");

    if(/For/.test(body.type))
      return;

    const context = StackFrame.find(path, true);
    const define = new DefineElement(context, key);

    parse(define, body);

    context.elementMod(define);

    path.remove();
  }
}

const JSXElement: Visitor<t.JSXElement> = {
  enter(path){
    if(OUTPUT_NODE.has(path.node)){
      path.skip();
      return;
    }

    const context = StackFrame.find(path, true);
    const element = new DefineElement(context, "element");

    addElementFromJSX(path, element);

    const result = element.toExpression()!;
    const within = path.parentPath;
    
    if(s.assert(within, "ExpressionStatement"))
      within.replaceWith(
        s.create("ReturnStatement", { argument: result })
      )
    else
      path.replaceWith(result);
  }
}