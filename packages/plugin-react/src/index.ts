import { Program as ProgramNode } from '@babel/types';
import { createFileContext, generateEntryElement } from 'parse';

import { replaceDoExpression } from 'regenerate/component';
import { closeModuleContext, createModuleContext } from 'regenerate/module';
import { DoExpressive, Visitor } from 'types';

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

const Program: Visitor<ProgramNode> = {
  enter(path, state){
    createFileContext(path.node, state);
    createModuleContext(path, state);
  },
  exit(path, state){
    closeModuleContext(state);
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