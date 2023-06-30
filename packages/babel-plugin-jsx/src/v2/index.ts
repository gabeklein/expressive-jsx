import { PluginObj, PluginPass } from '@babel/core';
import { VisitNode } from '@babel/traverse';
import * as t from 'syntax';

import { Context } from './context';
import { DefineContext } from './define';
import { isImplicitReturn } from './jsx';
import { handleLabel } from './modify';
import { FileContext } from './scope';

type Visit<T extends t.Node> = VisitNode<PluginPass, T>;

const Program: Visit<t.Program> = {
  enter(path, state){
    new FileContext(path, state);
  },
  exit(path){
    const context = path.data!.context as FileContext;
    const styles = context.runtimeStyle();

    if(styles)
      path.pushContainer("body", [ styles ]);

    context.root.close();
  }
};

const LabeledStatement: Visit<t.LabeledStatement> = {
  enter(path){
    if(path.get("body").isFor() || path.data)
      return;

    handleLabel(path);
  },
  exit(path){
    if(path.data?.context as Context)
      path.remove();
  }
}

const JSXElement: Visit<t.JSXElement> = {
  enter(path){
    if(isImplicitReturn(path))
      return;

    DefineContext.apply(path);
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