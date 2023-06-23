import { PluginObj, PluginPass } from '@babel/core';
import { getName } from 'parse/labels';
import * as $ from 'syntax';
import { Context, RootContext } from 'v2/context';
import { handleModifier } from 'v2/modify';

import type { NodePath, VisitNode } from '@babel/traverse';
import type { Node, JSXElement, LabeledStatement, Program } from '@babel/types';
import { generateCSS, styleDeclaration } from 'v2/styles';

type Visit<T extends Node> = VisitNode<PluginPass, T>;

const Program: Visit<Program> = {
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
  }
};

const LabeledStatement: Visit<LabeledStatement> = {
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

    if($.is(body, "IfStatement"))
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

const JSXElement: Visit<JSXElement> = {
  enter(path){
    if(isImplicitReturn(path))
      return;

    const context = Context.get(path);

    path.node.openingElement.attributes.push(
      $.jsxAttribute($.literal(context.define.uid), "className")
    )


  }
}

export default () => <PluginObj>({
  manipulateOptions(options, parse){
    parse.plugins.push("jsx");
  },
  visitor: {
    Program,
    LabeledStatement,
    JSXElement
  }
});

function isImplicitReturn(path: NodePath<JSXElement>){
  const parent = path.parentPath;

  if(!parent.isExpressionStatement() || !parent.parentPath!.parentPath!.isFunction())
    return false;

  parent.replaceWith($.returns(path.node));
  path.skip();

  return true;
}