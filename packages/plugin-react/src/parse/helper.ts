import { ParseErrors } from 'errors';
import { ensureArray } from 'shared';

import type { NodePath as Path } from '@babel/traverse';

const Oops = ParseErrors({
  NodeUnknown: "Unhandled node of type {1}",
  BadInputModifier: "Modifier input of type {1} not supported here!"
})

type HandleAny<T> = (target: T, path: Path<any>) => boolean | void;

export function parse<T>(
  target: T,
  using: HandleAny<T>,
  ast: Path<any>,
  key?: string){

  if(key)
    ast = ast.get(key) as any;

  const content = ast.isBlockStatement()
    ? ensureArray(ast.get("body"))
    : [ast];
  
  for(let item of content){
    if(item.isExpressionStatement())
      item = item.get("expression") as any;

    if(using(target, item))
      continue;

    throw Oops.NodeUnknown(item as any, item.type);
  }
}