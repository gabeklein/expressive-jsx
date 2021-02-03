import { Program as BabelProgram } from '@babel/types';

import {
  createFileContext,
  generateEntryElement
} from 'parse';

import {
  BabelState,
  DoExpressive,
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

export const DoExpression = <Visitor<DoExpressive>> {
  enter: (path, state) => {
    let { meta } = path.node;

    if(!meta)
      meta = generateEntryElement(path, state.context);

    meta.didEnterOwnScope(path)
  },
  exit: (path) => {
    path.node.meta.didExitOwnScope(path)
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