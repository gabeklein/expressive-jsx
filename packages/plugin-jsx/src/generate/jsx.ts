import * as s from 'syntax';

import type * as t from 'syntax/types';
import type { FileManager } from 'scope';
import type { PropData } from 'types';

export function createElement(
  this: FileManager,
  tag: null | string | t.JSXMemberExpression,
  properties: PropData[] = [],
  content: t.Expression[] = []
){
  if(!tag)
    tag = this.ensure("$pragma", "Fragment").name;

  const props = properties.map(
    ({ name, value }) => s.jsxAttr(value, name)
  );

  this.ensure("$pragma", "default", "React");

  return s.jsxCreate(tag, props, content);
}