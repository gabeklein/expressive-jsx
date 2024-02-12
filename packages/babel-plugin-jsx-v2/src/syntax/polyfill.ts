import { Options } from '../options';
import * as t from '../types';
import { uniqueIdentifier } from './unique';

const POLYFILL =  require.resolve("../../polyfill");

export function importClassNamesHelper(path: t.NodePath) {
  let { polyfill } = Options;
  const program = path.find(x => x.isProgram()) as t.NodePath<t.Program>;
  const body = program.get("body");

  for (const statement of body) {
    if (!statement.isImportDeclaration() || statement.node.source.value !== POLYFILL)
      continue;

    const specifiers = statement.get("specifiers");

    for (const spec of specifiers) {
      if (!spec.isImportSpecifier())
        continue;

      if (t.isIdentifier(spec.node.imported, { name: "classNames" }))
        return spec.node.local;
    }
  }

  const id = uniqueIdentifier(path.scope, "classNames");

  if(polyfill === false)
    return id;

  if(typeof polyfill !== "string")
    polyfill = POLYFILL;

  const importStatement = t.importDeclaration(
    [t.importSpecifier(id, t.identifier("classNames"))],
    t.stringLiteral(polyfill)
  );

  program.node.body.unshift(importStatement);
  return id;
}
