import { NodePath } from '@babel/traverse';
import * as t from '@babel/types';

import { returns } from './construct';
import { DefineContext } from './context';

export function isImplicitReturn(
  path: NodePath<t.JSXElement> | NodePath<t.JSXFragment>){

  const statement = path.parentPath;
  const block = statement.parentPath as NodePath<t.BlockStatement>;
  const within = block.parentPath as NodePath;

  if(!statement.isExpressionStatement() || !within.isFunction())
    return false;

  if(block.node.body.length === 1 && within.isArrowFunctionExpression())
    block.replaceWith(t.parenthesizedExpression(path.node));
  else
    statement.replaceWith(returns(path.node));

  path.skip();

  return true;
}

export function applyElement(
  context: DefineContext,
  path: NodePath<t.JSXElement>){

  const attrs = path.get("openingElement").get("attributes");
  const define = new Set<DefineContext>();
  const using = (name: string) => {
    const apply = context.get(name);
    apply.forEach(x => define.add(x));
    return apply.length > 0;
  }
  
  let tag = path.node.openingElement.name;

  while(t.isJSXMemberExpression(tag)){
    using(tag.property.name);
    tag = tag.object;
  }

  if(t.isJSXIdentifier(tag))
    using(tag.name);

  for(const attr of attrs){
    if(attr.isJSXSpreadAttribute())
      continue;

    let {
      name: { name },
      value
    } = attr.node as t.JSXAttribute;

    if(value)
      continue;
  
    if(typeof name !== "string")
      name = name.name;
    
    if(using(name))
      attr.remove();
  }

  for(const def of define)
    def.apply(path);
}