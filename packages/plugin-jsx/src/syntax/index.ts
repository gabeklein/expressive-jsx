export {
  importDeclaration,
  importSpecifier,
  importDefaultSpecifier
} from '@babel/types';

export * from './assertion';
export * from './construct';
export * from './jsx';

import type * as t from "@babel/types";

type NodeOfType<T extends t.Node["type"]> = t.Node & { type: T };

export function assert<T extends t.Node["type"], N extends NodeOfType<T>>(
  node: t.Node | null | undefined, type: T, fields?: Partial<N>): node is N {

  if(!(typeof node == "object") || !node)
    return false;

  if(type !== node.type)
      return false;
      
  if(fields)
    for(const k in fields){
      const expect = fields[k] as any;
      const value = (node as any)[k];

      if(expect !== value)
        return false;
    }
    
  return true;
}