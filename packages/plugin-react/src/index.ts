import { Program as ProgramNode } from '@babel/types';
import { generateEntryElement } from 'parse';

import { closeModuleContext, createModuleContext, replaceDoExpression } from 'regenerate';
import { DoExpressive, Visitor } from 'types';

const Program: Visitor<ProgramNode> = {
  enter: createModuleContext,
  exit: closeModuleContext
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