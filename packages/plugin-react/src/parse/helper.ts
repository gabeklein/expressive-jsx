import { ParseErrors } from 'errors';
import { ensureArray } from 'shared';
import type { NodePath as Path } from '@babel/traverse';
import type { Node, Statement, Expression } from '@babel/types';

const Oops = ParseErrors({
  NodeUnknown: "Unhandled node of type {1}",
  BadInputModifier: "Modifier input of type {1} not supported here!"
})

type PathFor<T extends Node['type']> = Path<Extract<Node, { type: T }>>;
type Apply<K extends Node['type'], T> = (this: T, path: PathFor<K>) => void;

export type ParserFor<T> = {
  [K in Node['type']]?: Apply<K, T>;
};

export function parser<T>(using: ParserFor<T>){
  return function(
    this: any,
    ast: Path<Statement> | Path<Expression>
  ){
    parse(ast, using, this)
  }
}

export function parse<T>(
  ast: Path<Statement> | Path<Expression>,
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