import { StackFrame } from 'context';
import { Status } from 'errors';
import { styleDeclaration } from 'generate/styles';
import { builtIn } from 'modifier/builtIn';
import { generateEntryElement } from 'parse/entry';
import { handleTopLevelDefine } from 'parse/labels';
import * as t from 'syntax';

import type { DoExpression, Expression, Program, Node, Statement , VisitNodeObject } from 'syntax';
import type { BabelFile, BabelState, Options} from 'types';

type Visitor<T extends Node, S extends StackFrame = StackFrame> =
  VisitNodeObject<BabelState<S>, T>;

const DEFAULT_OPTIONS: Options = {
  env: "web",
  styleMode: "compile",
  runtime: "@expressive/css",
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
    const options = { ...DEFAULT_OPTIONS, ...state.opts };
    const external = Object.assign({}, ...options.modifiers);

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
  exit(path, { filename, context }){
    const styleBlock = styleDeclaration(context, filename);

    if(styleBlock)
      path.pushContainer("body", [ styleBlock ]);
  
    context.program.close();
  }
}

const HandleDoExpression: Visitor<DoExpression> = {
  enter(path, state){
    let element = generateEntryElement(path, state.context);
    const collapsible = !element.exec;

    let output: Expression | Statement =
      element.toExpression(collapsible) || 
      t.booleanLiteral(false);
  
    if(element.exec && element.statements.length){
      const body = [
        ...element.statements,
        t.returnStatement(output)
      ];
  
      if(path.parentPath.isReturnStatement()){
        path.parentPath.replaceWithMultiple(body);
        return;
      }

      output = t.blockStatement(body);
    }

    path.replaceWith(output);
  }
}