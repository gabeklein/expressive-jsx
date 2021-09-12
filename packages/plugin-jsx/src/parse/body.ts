import * as s from 'syntax';
import { ParseErrors } from 'errors';
import { Prop } from 'handle/attributes';
import { ComponentFor } from 'handle/iterate';
import { ComponentIf } from 'handle/switch';
import { ensureArray } from 'utility';

import { addElementFromJSX } from './jsx';
import { handleDefine } from './labels';

import type * as t from 'syntax/types';
import type { Define } from 'handle/definition';

const Oops = ParseErrors({
  PropNotIdentifier: "Assignment must be identifier name of a prop."
})

export function parse(
  target: Define, ast: t.Path<any>, key?: string){

  if(key)
    ast = ast.get(key) as any;

  const content = s.assert(ast, "BlockStatement")
    ? ensureArray(ast.get("body"))
    : [ast];
  
  for(let item of content)
    parseContent(target, item);
}

export function parseContent(
  target: Define, path: t.Path<any>){

  if(s.assert(path, "LabeledStatement")){
    handleDefine(target, path);
    return;
  }
  
  if(s.assert(path, "IfStatement")){
    const item = new ComponentIf();
    item.setup(target.context, path);
    target.adopt(item);
    return;
  }

  if(s.assert(path, "ForInStatement")
  || s.assert(path, "ForOfStatement") ){
    new ComponentFor(path, target);
    return;
  }

  if(s.assert(path, "ForStatement")){
    new ComponentFor(path, target);
    return;
  }

  if(s.assert(path, "ExpressionStatement")){
    const e = path.get("expression") as t.Path<t.Node>;

    if(e.isJSXElement()){
      addElementFromJSX(e, target);
      return;
    }

    if(e.isAssignmentExpression({ operator: "=" })){
      const { left, right } = e.node;
  
      if(left.type !== "Identifier")
        throw Oops.PropNotIdentifier(left)
  
      const prop = new Prop(left.name, right);
        
      target.add(prop);
      
      return;
    }
  }

  target.statements.push(path.node);
}