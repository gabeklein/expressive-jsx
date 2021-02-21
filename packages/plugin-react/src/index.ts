import { StackFrame } from 'context';
import { Status } from 'errors';
import { handleTopLevelModifier, printStyles } from 'modifier';
import { generateEntryElement } from 'parse';
import { replaceDoExpression } from 'regenerate';
import { meta } from 'shared';

import { builtIn } from './modifier';

import type {
  DoExpression as DoExpressionNode,
  Program as ProgramNode
} from '@babel/types';
import type { BabelFile, Visitor } from 'types';

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
        handleTopLevelModifier(item, context);
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

const DoExpression: Visitor<DoExpressionNode> = {
  enter(path, state){
    let { meta: element } = meta(path.node);

    if(!element)
      element = generateEntryElement(path, state.context);

    const traversable = path.get("body").get("body");

    for(const item of traversable)
      element.parse(item);
  },
  exit: replaceDoExpression
}

export default () => {
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