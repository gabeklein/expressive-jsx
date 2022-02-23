import { StackFrame } from 'context';
import { OUTPUT_NODE } from 'generate/jsx';
import { styleDeclaration } from 'generate/styles';
import { Define, ElementInline } from 'handle/definition';
import { parse } from 'parse/body';
import { applyModifier, parseJSX } from 'parse/jsx';
import { getName, handleModifier, Oops } from 'parse/labels';
import * as s from 'syntax';

import type { Visitor } from 'types';
import type * as t from 'syntax/types';

export default () => ({
  manipulateOptions: (options: any, parse: any) => {
    parse.plugins.push("doExpressions", "jsx");
  },
  visitor: {
    Program,
    JSXElement,
    LabeledStatement
  }
})

const Program: Visitor<t.Program> = {
  enter(path, state){
    state.context = StackFrame.create(path, state);
  },
  exit(path, { context, filename }){
    const styleBlock = styleDeclaration(context, filename);

    if(styleBlock)
      path.pushContainer("body", [ styleBlock ]);
  
    context.program.close();
  }
}

const LabeledStatement: Visitor<t.LabeledStatement> = {
  enter(path){
    const key = getName(path);
    const body = path.get("body");

    if(/For/.test(body.type))
      return;

    const context = StackFrame.find(path, true);

    switch(body.type){
      case "BlockStatement": {
        const define = new Define(context, key);

        parse(define, body);
        context.setModifier(define);
        break;
      }
      
      case "ExpressionStatement":
      case "LabeledStatement":
      case "IfStatement": {
        handleModifier(context.ambient, key, body);
        break;
      }
  
      default:
        Oops.BadInputModifier(body, body.type)
    }

    path.remove();
  }
}

const JSXElement: Visitor<t.JSXElement> = {
  enter(path){
    if(OUTPUT_NODE.has(path.node)){
      path.skip();
      return;
    }

    const isComponent = s.assert(path.parentPath, "ExpressionStatement");
    const context = StackFrame.find(path, true);
    const ownStyle = context.ambient;
    let target = new ElementInline(context);

    parseJSX(target, path);

    if(isComponent && ownStyle.containsStyle() && !ownStyle.isUsed){
      const wrap = new ElementInline(target.context);
      
      wrap.adopt(target);
      applyModifier(wrap, ownStyle);

      target = wrap;
    }

    const element = target.toExpression();
    
    if(isComponent)
      path.parentPath.replaceWith(
        s.create("ReturnStatement", { argument: element })
      )
    else
      path.replaceWith(element);
  }
}