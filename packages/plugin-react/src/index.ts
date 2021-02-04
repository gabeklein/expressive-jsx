import { Program as ProgramNode } from '@babel/types';
import Core, { DoExpressive } from '@expressive/babel-plugin-core';

import { replaceDoExpression } from 'regenerate/component';
import { closeModuleContext, createModuleContext } from 'regenerate/module';
import { Visitor } from 'types';

const DoExpression: Visitor<DoExpressive> = {
  exit(path){
    replaceDoExpression(path)
  }
}

const Program: Visitor<ProgramNode> = {
  enter(path, state){
    createModuleContext(path, state);
  },
  exit(path, state){
    closeModuleContext(state);
  }
}

export default (options: any) => {
  return {
    inherits: Core,
    visitor: {
      Program,
      DoExpression
    }
  }
}