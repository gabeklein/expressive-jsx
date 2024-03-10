import { Options } from '../options';
import * as t from '../types';
import { uniqueIdentifier } from './unique';

export function getHelper(program: t.NodePath<t.Program>, name: string){
  const { polyfill } = Options;
  const body = program.get("body");

  for(const statement of body){
    if(!statement.isImportDeclaration() || statement.node.source.value !== polyfill)
      continue;

    const specifiers = statement.get("specifiers");

    for(const spec of specifiers){
      if(!spec.isImportSpecifier())
        continue;

      if(t.isIdentifier(spec.node.imported, { name }))
        return spec.node.local;
    }
  }

  const concat = uniqueIdentifier(program.scope, name);

  if(polyfill){
    const importStatement = t.importDeclaration(
      [t.importSpecifier(concat, t.identifier(name))],
      t.stringLiteral(polyfill)
    );
  
    program.unshiftContainer("body", importStatement);
  }

  return concat;
}