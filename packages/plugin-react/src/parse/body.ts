import * as t from '@babel/types';
import { ParseErrors } from 'errors';
import { ComponentFor, ComponentForX, ComponentIf, Prop } from 'handle';
import { ensureArray } from 'utility';

import { addElementFromJSX } from './jsx';
import { parseDefineBlock } from './labels';

import type { NodePath as Path } from '@babel/traverse';
import type { Node } from '@babel/types';
import type { Define } from 'handle';

const Oops = ParseErrors({
  BadInputModifier: "Modifier input of type {1} not supported here!",
  IfStatementCannotContinue: "Previous consequent already returned, cannot integrate another clause.",
  ExpressionUnknown: "Unhandled expressionary statement of type {1}",
  NodeUnknown: "Unhandled node of type {1}",
  PropNotIdentifier: "Assignment must be identifier name of a prop."
})

export function parse(
  target: Define, ast: Path<any>, key?: string){

  if(key)
    ast = ast.get(key) as any;

  const content = ast.isBlockStatement()
    ? ensureArray(ast.get("body"))
    : [ast];
  
  for(let item of content)
    parseContent(target, item);
}

export function parseContent(
  target: Define, path: Path<any>){

  if(path.isLabeledStatement()){
    parseDefineBlock(target, path);
    return;
  }
  
  if(path.isIfStatement()){
    const item = new ComponentIf(path, target.context);
    target.adopt(item);
    item.setup();
    return;
  }

  if(path.isForXStatement()){
    new ComponentForX(path, target);
    return;
  }

  if(path.isForStatement()){
    new ComponentFor(path, target);
    return;
  }

  if(path.isExpressionStatement()){
    const e = path.get("expression") as Path<Node>;

    if(e.isJSXElement()){
      addElementFromJSX(e, target);
      return;
    }

    if(e.isAssignmentExpression({ operator: "=" })){
      const { left, right } = e.node;
  
      if(!t.isIdentifier(left))
        throw Oops.PropNotIdentifier(left)
  
      const prop = new Prop(left.name, right);
        
      target.add(prop);
      
      return;
    }
  }

  target.statements.push(path.node);
}