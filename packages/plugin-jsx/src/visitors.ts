import { StackFrame } from 'context';
import { Status } from 'errors';
import { OUTPUT_NODE } from 'generate/jsx';
import { styleDeclaration } from 'generate/styles';
import { DefineContainer, DefineElement } from 'handle/definition';
import { parse } from 'parse/body';
import { addElementFromJSX } from 'parse/jsx';
import { handleTopLevelDefine } from 'parse/labels';
import * as s from 'syntax';

import type * as t from 'syntax/types';
import type { BabelFile, Visitor } from 'types';
  
export const Program: Visitor<t.Program> = {
  enter(path, state){
    const context = state.context =
      StackFrame.create(path, state);
  
    Status.currentFile = state.file as BabelFile;
  
    for(const item of path.get("body"))
      if(s.assert(item, "LabeledStatement")){
        handleTopLevelDefine(item, context);
        item.remove();
      }
  },
  exit(path, { filename, context }){
    const styleBlock = styleDeclaration(context, filename);

    if(styleBlock)
      path.pushContainer("body", [ styleBlock ]);
  
    context.program.close();
  }
}

export const DoExpression: Visitor<t.DoExpression> = {
  enter(path, state){
    const element = new DefineContainer(state.context, path);
    const collapsible = !element.exec;
  
    parse(element, path.get("body"));

    let output: t.Expression | t.Statement =
      element.toExpression(collapsible) || s.literal(false);
  
    if(element.exec && element.statements.length){
      const parent = path.parentPath;
      const body = [
        ...element.statements,
        s.returns(output as t.Expression)
      ];
  
      if(s.assert(parent, "ReturnStatement")){
        parent.replaceWithMultiple(body);
        return;
      }

      output = s.block(...body);
    }

    path.replaceWith(output);
  }
}

export const JSXElement: Visitor<t.JSXElement> = {
  enter(path, state){
    if(OUTPUT_NODE.has(path.node)){
      path.skip();
      return;
    }

    const element = new DefineElement(state.context, "element");

    addElementFromJSX(path, element);

    const result = element.toExpression();

    path.replaceWith(result!);
  }
}