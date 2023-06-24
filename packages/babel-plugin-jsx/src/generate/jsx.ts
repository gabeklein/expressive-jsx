import * as $ from 'syntax';

import * as t from 'syntax/types';
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
    $.jsxAttribute(prop.value, prop.name)
  ));

  this.ensure("$pragma", "default", "React");

  const element = $.jsxElement(tag, props, content);

  OUTPUT_NODE.add(element);

  return element;
}