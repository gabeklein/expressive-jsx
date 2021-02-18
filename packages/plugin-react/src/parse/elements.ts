import { ParseErrors } from 'errors';
import { ensureArray } from 'shared';
import type { NodePath } from '@babel/traverse';
import type { Node, Statement } from '@babel/types';
import type { TraversableBody } from 'handle/block';

const Oops = ParseErrors({
  NodeUnknown: "Unhandled node of type {1}",
  BadInputModifier: "Modifier input of type {1} not supported here!"
})

type PathFor<T extends Node['type']> = NodePath<Extract<Node, { type: T }>>;

export type ParserFor<T extends TraversableBody = TraversableBody> = {
  [K in Node['type']]?: (this: T, path: PathFor<K>) => void;
};

export function parse<T extends TraversableBody>(
  ast: NodePath<Statement>,
  using: ParserFor<T>,
  target: T){

  const content = ast.isBlockStatement()
    ? ensureArray(ast.get("body"))
    : [ast];
  
  for(let item of content){
    if(item.isExpressionStatement())
      item = item.get("expression") as any;

    const { type } = item;

    if(type in using){
      const handler: any = using[type];
      handler.call(target, item);
    }
    else
      throw Oops.NodeUnknown(item as any, item.type);
  }
}