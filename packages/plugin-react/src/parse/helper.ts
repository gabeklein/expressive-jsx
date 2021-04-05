import { ParseErrors } from 'errors';
import { ensureArray } from 'shared';

import type { NodePath as Path } from '@babel/traverse';
import type { Node } from '@babel/types';

const Oops = ParseErrors({
  NodeUnknown: "Unhandled node of type {1}",
  BadInputModifier: "Modifier input of type {1} not supported here!"
})

type PathFor<T extends Node['type']> = Path<Extract<Node, { type: T }>>;
type Apply<K extends Node['type'], T> = (this: T, path: PathFor<K>) => void;
type HandleAny<T> = (this: T, path: Path<any>) => void;
type HandleMany<T> = { [K in Node['type']]?: Apply<K, T> };

export type ParserFor<T> =
  | HandleMany<T> | HandleAny<T>;

export function parse<T>(
  target: T,
  using: ParserFor<T>,
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

    if(typeof using == "function")
      using.call(target, item);

    if(typeof using == "object"){
      const { type } = item;

      if(type in using){
        const handler = (using as any)[type];
        handler.call(target, item);
      }
      else
        throw Oops.NodeUnknown(item as any, item.type);
    }
  }
}