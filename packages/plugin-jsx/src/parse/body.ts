import { ParseErrors } from 'errors';
import { Prop } from 'handle/attributes';
import { ComponentFor } from 'handle/iterate';
import { ComponentIf } from 'handle/switch';
import * as t from 'syntax';
import { ensureArray } from 'utility';

import { addElementFromJSX } from './jsx';
import { handleDefine } from './labels';

import type { Define } from 'handle/definition';
import type { Node, Path } from 'syntax';

const Oops = ParseErrors({
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
    handleDefine(target, path);
    return;
  }
  
  if(path.isIfStatement()){
    const item = new ComponentIf();
    item.setup(target.context, path);
    target.adopt(item);
    return;
  }

  if(path.isForXStatement()){
    new ComponentFor(path, target);
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