import { Options } from '../options';
import * as t from '../types';
import { uniqueIdentifier } from './unique';

const POLYFILL = require.resolve("../../polyfill");

export function setClassNames(
  path: t.NodePath<t.JSXElement>,
  classNames: t.Expression[]){

  const attributes = path.node.openingElement.attributes;
  const classNameProp = attributes.find(
    x => t.isJSXAttribute(x) &&
    x.name.name === "className"
  ) as t.JSXAttribute | undefined;

  if(classNameProp){
    const { value } = classNameProp;

    if(t.isJSXExpressionContainer(value)
    && t.isArrayExpression(value.expression))
      classNames.unshift(value.expression);
    
    if(t.isStringLiteral(value))
      classNames.unshift(value);
  }

  classNames = optimizeClassNames(classNames);

  const classNameValue = classNames.length == 1
    ? classNames[0]
    : t.callExpression(
      importClassNamesHelper(path),
      classNames
    );
  
  const classNamePropValue = t.isStringLiteral(classNameValue)
    ? classNameValue
    : t.jsxExpressionContainer(classNameValue);

  if(classNameProp)
    classNameProp.value = classNamePropValue;
  else
    attributes.push(
      t.jsxAttribute(
        t.jsxIdentifier("className"),
        classNamePropValue
      )
    );
}

function optimizeClassNames(expressions: t.Expression[]){
  const optimized: t.Expression[] = [];

  for(const expr of expressions){
    if(t.isStringLiteral(expr)){
      const last = optimized[optimized.length - 1];

      if(t.isStringLiteral(last)){
        last.value += " " + expr.value;
        continue;
      }
    }

    optimized.push(expr);
  }

  return optimized;
}

function importClassNamesHelper(path: t.NodePath) {
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