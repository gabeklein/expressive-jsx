import * as s from 'syntax';

import type * as t from 'syntax/types';
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

  const props = properties.map(prop => (
    s.jsxAttribute(prop.value, prop.name)
  ));

  this.ensure("$pragma", "default", "React");

  const element = s.jsxElement(tag, props, content);

  OUTPUT_NODE.add(element);

  return element;
}