import { NodePath } from '@babel/traverse';
import { Expression, JSXElement, Program } from '@babel/types';
import { Plugin } from '@expressive/babel-plugin-jsx';

import { Options } from '..';
import t from '../types';
import { isStandard } from './tags';
import { uniqueIdentifier } from './uniqueIdentifier';

const POLYFILL_DEFAULT = "@expressive/babel-preset/polyfill";

/** TODO: Move to a default handler included with macros. */
export function fixTagName(path: any){
  const { name } = path.node.openingElement;

  if(t.isJSXIdentifier(name)
  && !/^[A-Z]/.test(name.name)
  && !isStandard(name.name))
    setTagName(path, "div");
}

export function getClassName(
  context: Plugin.Context,
  module?: Expression
): Expression | undefined {
  if(!context.props.size && !context.children.size)
    return;

  const { condition, alternate, uid } = context;

  if(typeof condition == "string" || t.isStringLiteral(condition))
    return;

  const value = module
    ? t.memberExpression(module, t.identifier(uid), false)
    : t.stringLiteral(uid);

  if(!condition)
    return value;

  if(alternate){
    let alt = getClassName(alternate, module);

    if(typeof alt === "string")
      alt = t.stringLiteral(alt);

    if(alt)
      return t.conditionalExpression(condition, value, alt);
  }

  return t.logicalExpression("&&", condition, value);
}

export function addClassName(
  path: NodePath<JSXElement>,
  name: string | Expression,
  options: Options) {

  const existing = hasProp(path, "className");
  const opening = path.get("openingElement");

  if(typeof name == "string")
    name = t.stringLiteral(name);

  if(t.isStringLiteral(existing) && t.isStringLiteral(name)) {
    existing.value += " " + name.value;
    return;
  }

  if(!existing) {
    opening.pushContainer(
      "attributes",
      t.jsxAttribute(
        t.jsxIdentifier("className"),
        t.isStringLiteral(name)
          ? name : t.jsxExpressionContainer(name)
      )
    );
    return;
  }

  const concat = importPolyfill("classNames", path, options);

  if(t.isCallExpression(existing)
    && t.isIdentifier(existing.callee, { name: concat.name }))
    if(t.isStringLiteral(name)) {
      for(const value of existing.arguments)
        if(t.isStringLiteral(value)) {
          value.value += " " + name.value;
          return;
        }
    }
    else {
      existing.arguments.push(name);
      return;
    }

  for(const attr of opening.get("attributes"))
    if(attr.isJSXAttribute()
    && attr.get("name").isJSXIdentifier({ name: "className" })) {
      attr.node.value = t.jsxExpressionContainer(
        t.callExpression(concat, [name, existing])
      );
      return;
    }

  throw new Error("Could not insert className");
}

export function spreadProps(path: NodePath<JSXElement>, props: Expression){
  path
    .get("openingElement")
    .unshiftContainer("attributes", t.jsxSpreadAttribute(props))
}

export function setTagName(path: NodePath<JSXElement>, name: string){
  const { openingElement, closingElement } = path.node;
  const tag = t.jsxIdentifier(name);

  openingElement.name = tag;

  if(closingElement)
    closingElement.name = tag;
}

export function hasProp(path: NodePath<JSXElement>, name: string){
  for(const attr of path.node.openingElement.attributes)
    if(t.isJSXAttribute(attr) && attr.name.name === name){
      const { value } = attr;

      if(t.isJSXExpressionContainer(value) && t.isExpression(value.expression))
        return value.expression;

      if(t.isExpression(value))
        return value;
    }
}

export function importPolyfill(
  name: string, from: NodePath, options: Options){

  const { polyfill = POLYFILL_DEFAULT } = options;
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