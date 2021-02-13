import { Program as ProgramNode } from '@babel/types';
import { StackFrame } from 'context';
import { Status } from 'errors';
import { handleTopLevelModifier, printStyles } from 'modifier';
import { generateEntryElement } from 'parse';
import { replaceDoExpression } from 'regenerate';
import { BabelFile, DoExpressive, Visitor } from 'types';
import { builtIn } from './modifier';

const Program: Visitor<ProgramNode> = {
  enter(path, state){

    const external =
      Object.assign({}, ...state.opts.modifiers);

    const context = state.context = 
      new StackFrame(path, state)
        .including([ builtIn, external ]);
  
    Status.currentFile = state.file as BabelFile;
  
    for(const item of path.get("body"))
      if(item.isLabeledStatement()){
        handleTopLevelModifier(item.node, context);
        item.remove();
      }
  },
  exit(path, state){
    const { Imports } = state.context;
    const styleBlock = printStyles(state);
  
    if(styleBlock)
      path.pushContainer("body", [ styleBlock ]);
  
    Imports.EOF();
    
  }
}

const DoExpression: Visitor<DoExpressive> = {
  enter(path, state){
    let { meta } = path.node;

    if(!meta)
      meta = generateEntryElement(path, state.context);

    meta.didEnterOwnScope(path)
  },
  exit(path){
    path.node.meta.didExitOwnScope(path);
    replaceDoExpression(path)
  }
}

export default (options: any) => {
  return {
    manipulateOptions: (options: any, parse: any) => {
      parse.plugins.push("doExpressions", "jsx")
    },
    visitor: {
      Program,
      DoExpression
    }
  }
}