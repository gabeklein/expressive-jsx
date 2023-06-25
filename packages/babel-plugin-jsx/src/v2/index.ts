import { PluginObj, PluginPass } from '@babel/core';
import { VisitNode } from '@babel/traverse';
import * as t from 'syntax';

import { Context, RootContext } from './context';
import { applyModifier, isImplicitReturn } from './jsx';
import { handleLabel } from './modify';
import { generateCSS, styleDeclaration } from './styles';

type Visit<T extends t.Node> = VisitNode<PluginPass, T>;

const Program: Visit<t.Program> = {
  enter(path, state){
    path.data = {
      context: new RootContext(path, state)
    };
  },
  exit(path){
    const context = path.data!.context as RootContext;
    const stylesheet = generateCSS(context);

    if(stylesheet)
      path.pushContainer("body", [ 
        styleDeclaration(stylesheet, context)
      ]);

    context.file.close();
  }
};

const LabeledStatement: Visit<t.LabeledStatement> = {
  enter(path){
    if(path.get("body").isFor() || path.data)
      return;

    handleLabel(path);
  },
  exit(path){
    const context = path.data?.context as Context;

    if(!context)
      return;

    if(context.exit)
      context.exit();

    path.remove();
  }
}

const JSXElement: Visit<t.JSXElement> = {
  enter(path){
    if(isImplicitReturn(path))
      return;

    const context = Context.get(path);

    applyModifier(context, path);
  }
}

export default () => <PluginObj>({
  manipulateOptions(options, parse){
    parse.plugins.push("jsx");
  },
  visitor: {
    Program,
    LabeledStatement,
    JSXElement,
    JSXFragment: isImplicitReturn
  }
});