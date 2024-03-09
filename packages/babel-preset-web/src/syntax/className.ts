import { Options } from '../options';
import * as t from '../types';
import { getProp } from './element';
import { uniqueIdentifier } from './unique';

export function addClassName(
  path: t.NodePath<t.JSXElement>,
  name: string | t.Expression
){
  const { node, scope } = path;
  const { attributes } = node.openingElement;
  const { polyfill } = Options;
  const existing = getProp(node, "className");

  if(typeof name == "string")
    name = t.stringLiteral(name);

  if(t.isStringLiteral(existing) && t.isStringLiteral(name)){
    existing.value += " " + name.value;
    return;
  }

  if(!existing){
    attributes.push(
      t.jsxAttribute(
        t.jsxIdentifier("className"),
        t.isStringLiteral(name)
          ? name : t.jsxExpressionContainer(name)
      )
    );
    return;
  }

  const program = path.find(x => x.isProgram()) as t.NodePath<t.Program>;
  const body = program.get("body");

  for(const statement of body){
    if(!statement.isImportDeclaration() || statement.node.source.value !== polyfill)
      continue;

    const specifiers = statement.get("specifiers");

    for(const spec of specifiers){
      if(!spec.isImportSpecifier())
        continue;

      if(t.isIdentifier(spec.node.imported, { name: "classNames" }))
        return spec.node.local;
    }
  }

  const concat = uniqueIdentifier(scope, "classNames");

  if(polyfill){
    const importStatement = t.importDeclaration(
      [t.importSpecifier(concat, t.identifier("classNames"))],
      t.stringLiteral(polyfill)
    );
  
    program.node.body.unshift(importStatement);
  }

  if(t.isCallExpression(existing) && existing.callee === concat){
    if(!t.isStringLiteral(name))
      existing.arguments.push(name);
    else
      for(const value of existing.arguments)
        if(t.isStringLiteral(value)){
          value.value += " " + name.value;
          return;
        }
  }

  for(const attr of attributes)
    if(t.isJSXAttribute(attr) && t.isJSXIdentifier(attr.name, { name: "className" })){
      attr.value = t.jsxExpressionContainer(
        t.callExpression(concat, [name, existing])
      )
      return;
    }

  throw new Error("Could not insert className");
}