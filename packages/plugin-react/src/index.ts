import * as t from '@babel/types';
import { StackFrame } from 'context';
import { Status } from 'errors';
import { printStyles } from 'generate';
import { handleTopLevelDefine } from 'modifier/apply';
import { builtIn } from 'modifier/builtIn';
import { generateEntryElement } from 'parse';

import type { DoExpression, Program } from '@babel/types';
import type { BabelFile, Visitor } from 'types';

export default () => ({
  manipulateOptions: (options: any, parse: any) => {
    parse.plugins.push("doExpressions", "jsx");
  },
  visitor: {
    Program: HandleProgram,
    DoExpression: HandleDoExpression
  }
})

const HandleProgram: Visitor<Program> = {
  enter(path, state){
    const external =
      Object.assign({}, ...state.opts.modifiers);

    const context = state.context = 
      new StackFrame(path, state)
        .including([ builtIn, external ]);
  
    Status.currentFile = state.file as BabelFile;
  
    for(const item of path.get("body"))
      if(item.isLabeledStatement()){
        handleTopLevelDefine(item, context);
        item.remove();
      }
  },
  exit(path, state){
    const styleBlock = printStyles(state);
  
    if(styleBlock)
      path.pushContainer("body", [ styleBlock ]);
  
    state.context.Scope.EOF();
  }
}

const HandleDoExpression: Visitor<DoExpression> = {
  enter(path, state){
    let element = generateEntryElement(path, state.context);

    const { statements } = element;
    const output =
      element.toExpression() || t.booleanLiteral(false);
  
    if(element.exec && statements.length){
      const body = [
        ...statements,
        t.returnStatement(output)
      ];
  
      if(path.parentPath.isReturnStatement())
        path.parentPath.replaceWithMultiple(body)
      else
        path.replaceWith(t.blockStatement(body))
    }
    else
      path.replaceWith(output);
  }
}