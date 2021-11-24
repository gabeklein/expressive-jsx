import { StackFrame } from 'context';
import { Status } from 'errors';
import { OUTPUT_NODE } from 'generate/jsx';
import { styleDeclaration } from 'generate/styles';
import { DefineElement } from 'handle/definition';
import { builtIn } from 'modifier/builtIn';
import { generateEntryElement } from 'parse/entry';
import { addElementFromJSX } from 'parse/jsx';
import { handleTopLevelDefine } from 'parse/labels';
import * as s from 'syntax';

import type * as t from 'syntax/types';
import type { BabelFile, BabelState, Options } from 'types';

type Visitor<T extends t.Node, S extends StackFrame = StackFrame> =
  t.VisitNodeObject<BabelState<S>, T>;

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
    DoExpression: HandleDoExpression,
    JSXElement: HandleNakedJSX
  }
})

const HandleProgram: Visitor<t.Program> = {
  enter(path, state){
    const options = { ...DEFAULT_OPTIONS, ...state.opts };
    const external = Object.assign({}, ...options.modifiers);

    const context = state.context = 
      new StackFrame(path, state, options)
        .including([ builtIn, external ]);
  
    Status.currentFile = state.file as BabelFile;
  
    for(const item of path.get("body"))
      if(s.assert(item, "LabeledStatement")){
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

const HandleDoExpression: Visitor<t.DoExpression> = {
  enter(path, state){
    let element = generateEntryElement(path, state.context);
    const collapsible = !element.exec;

    let output: t.Expression | t.Statement =
      element.toExpression(collapsible) || s.literal(false);
  
    if(element.exec && element.statements.length){
      const parent = path.parentPath;
      const body = [
        ...element.statements,
        s.returns(output as t.Expression)
      ];
  
      if(s.assert(parent, "ReturnStatement")){
        parent.replaceWithMultiple(body);
        return;
      }

      output = s.block(...body);
    }

    path.replaceWith(output);
  }
}

const HandleNakedJSX: Visitor<t.JSXElement> = {
  enter(path, state){
    if(OUTPUT_NODE.has(path.node)){
      path.skip();
      return;
    }

    const element = new DefineElement(state.context, "element");

    addElementFromJSX(path, element);

    const result = element.toExpression();

    path.replaceWith(result!);
  }
}