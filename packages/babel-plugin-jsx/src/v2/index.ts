import { PluginObj, PluginPass } from '@babel/core';
import { VisitNode } from '@babel/traverse';
import * as t from 'syntax';
import { Options } from 'types';
import { hash } from 'utility';

import { Context } from './context';
import { applyModifier, isImplicitReturn } from './jsx';
import { handleLabel } from './modify';
import { FileContext } from './scope';
import { generateCSS, styleDeclaration } from './styles';

type Visit<T extends t.Node> = VisitNode<PluginPass, T>;


const Program: Visit<t.Program> = {
  enter(path, state){
    path.data = {
      context: new FileContext(path, state)
    };
  },
  exit(path, { opts, filename }){
    const { hot } = opts as Options;
    const { file } = path.data!.context as FileContext;
    const token = hot === false ? undefined : hash(filename, 10);
    const stylesheet = generateCSS(file.declared);

    if(stylesheet)
      path.pushContainer("body", [ 
        styleDeclaration(stylesheet, file, token)
      ]);

    file.close();
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