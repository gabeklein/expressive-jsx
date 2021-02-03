import { Program as BabelProgram } from '@babel/types';

import {
  createFileContext,
  DoExpression
} from 'parse';

import {
  BabelState,
  Visitor
} from 'types';

export {
  ParseErrors
} from 'shared';

export {
  ComponentExpression,
  ComponentIf,
  ContingentModifier,
  ElementInline,
  ExplicitStyle,
  Prop,
  ElementModifier
} from "handle";

export {
  ElementConstruct
} from "generate";

const Program = <Visitor<BabelProgram>>{
  enter({ node }, state: BabelState){
    createFileContext(node, state);
  }
}

export default (options: any) => {
  return {
    manipulateOptions: (options: any, parse: any) => {
      parse.plugins.push("decorators-legacy", "doExpressions", "jsx")
    },
    visitor: {
      Program,
      DoExpression
    }
  }
}