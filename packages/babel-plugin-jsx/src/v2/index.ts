import { PluginObj, PluginPass } from '@babel/core';
import { VisitNode } from '@babel/traverse';
import { getLocalFilename } from 'parse/entry';
import * as t from 'syntax';

import { Context } from './context';
import { applyModifier, isImplicitReturn } from './jsx';
import { handleLabel } from './modify';
import { File } from './scope';
import { generateCSS, styleDeclaration } from './styles';
import { Options } from 'types';
import { hash } from 'utility';

type Visit<T extends t.Node> = VisitNode<PluginPass, T>;

const DEFAULTS: Options = {
  env: "web",
  styleMode: "compile",
  runtime: "@expressive/css",
  pragma: "react",
  output: "js",
  macros: []
};

const Program: Visit<t.Program> = {
  enter(path, state){
    const opts = { ...DEFAULTS, ...state.opts };
    const file = File.create(opts, path);
    const name = getLocalFilename(path.hub);
    const context = new Context(file, name);

    Object.assign(context.macros, ...opts.macros);
    path.data = { context };
  },
  exit(path, { opts, filename }){
    const { hot } = opts as Options;
    const { file } = path.data!.context as Context;
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