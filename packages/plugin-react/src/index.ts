import * as t from '@babel/types';
import { StackFrame } from 'context';
import { Status } from 'errors';
import { printStyles } from 'generate';
import { builtIn } from 'modifier/builtIn';
import { generateEntryElement } from 'parse/entry';
import { handleTopLevelDefine } from 'parse/labels';

import type { DoExpression, Program, Node } from '@babel/types';
import type { BabelFile, BabelState, Options } from 'types';
import type { VisitNodeObject } from '@babel/traverse';

type Visitor<T extends Node, S extends StackFrame = StackFrame> =
  VisitNodeObject<BabelState<S>, T>;

const DEFAULT_OPTIONS: Options = {
  env: "web",
  styleMode: "compile",
  runtime: "@expressive/react",
  pragma: "react",
  output: "js",
  modifiers: []
};

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

    const options = { ...DEFAULT_OPTIONS, ...state.opts };

    const context = state.context = 
      new StackFrame(path, state, options)
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