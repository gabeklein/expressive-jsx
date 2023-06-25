import { PluginObj, PluginPass } from '@babel/core';
import { getName } from 'parse/labels';
import * as t from 'syntax';
import { Context, RootContext } from 'v2/context';
import { handleModifier } from 'v2/modify';
import { generateCSS, styleDeclaration } from 'v2/styles';

import { applyModifier, isImplicitReturn } from './jsx';

import type { VisitNode } from '@babel/traverse';

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
    let body = path.get("body");

    if(body.isFor() || path.data)
      return;

    const context = Context.get(path);

    let key = getName(path);

    while(body.isLabeledStatement()){
      key += body.node.label.name;
      body.data = {};
      body = body.get("body");
    }

    if(body.isIfStatement())
      key += "if";

    if(body.isBlockStatement()){
      path.data = {
        context: new Context(key, context)
      };
      return;
    }
    
    if(body.isExpressionStatement()){
      path.data = { context };
      handleModifier(key, context.define, body);
    }
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
    JSXFragment(path){
      isImplicitReturn(path as any);
    }
  }
});