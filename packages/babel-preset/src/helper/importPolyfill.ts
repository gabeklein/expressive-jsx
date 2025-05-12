import { NodePath } from '@babel/traverse';
import { Program } from '@babel/types';

import t from '../types';
import { uniqueIdentifier } from './uniqueIdentifier';

const POLYFILL_DEFAULT = "@expressive/babel-preset/polyfill";

export function importPolyfill(
  name: string,
  from: NodePath,
  polyfill: string | null = POLYFILL_DEFAULT){

  const program = from.findParent((path) => path.isProgram()) as NodePath<Program>;
  const body = program.get("body");

  for(const statement of body){
    if(!statement.isImportDeclaration()
    || statement.node.source.value !== polyfill)
      continue;

    const specifiers = statement.get("specifiers");

    for(const spec of specifiers){
      if(!spec.isImportSpecifier())
        continue;

      if(t.isIdentifier(spec.node.imported, { name }))
        return spec.node.local;
    }
  }

  const concat = uniqueIdentifier(from.scope, name);

  if(polyfill){
    const importStatement = t.importDeclaration(
      [t.importSpecifier(concat, t.identifier(name))],
      t.stringLiteral(polyfill)
    );
  
    program.unshiftContainer("body", importStatement);
  }

  return concat;
}