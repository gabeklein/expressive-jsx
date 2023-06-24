
import * as t from 'syntax';
import type { FileManager } from 'scope';
import type { PropData } from 'types';

export const OUTPUT_NODE = new WeakSet();

export function createElement(
  this: FileManager,
  tag: null | string | t.JSXMemberExpression,
  properties: PropData[] = [],
  content: t.Expression[] = []
){
  if(!tag)
    tag = this.ensure("$pragma", "Fragment").name;

  const props = properties.map(({ name, value }) => {
    if(typeof name !== "string")
      return t.jsxSpreadAttribute(value);
  
    const jsxValue = t.isStringLiteral(value)
      ? value.value === "true" ? null : value
      : t.jsxExpressionContainer(value);
  
    return t.jsxAttribute(
      t.jsxIdentifier(name),
      jsxValue
    );
  });

  this.ensure("$pragma", "default", "React");

  const element = t.jsxTag(tag, props, content);

  OUTPUT_NODE.add(element);

  return element;
}