import { is, node } from './nodes';

import type * as t from './types';

type JSXReference = t.JSXIdentifier | t.JSXMemberExpression;

export type JSXChild =
  | t.JSXElement
  | t.JSXFragment
  | t.JSXExpressionContainer
  | t.JSXSpreadChild
  | t.JSXText;

export const VALID_HTML = [
  "a",
  "abbr",
  "address",
  "area",
  "article",
  "aside",
  "audio",
  "b",
  "base",
  "bdo",
  "bgsound",
  "blink",
  "blockquote",
  "br",
  "button",
  "canvas",
  "caption",
  "cite",
  "code",
  "col",
  "colgroup",
  "command",
  "comment",
  "datalist",
  "dd",
  "del",
  "details",
  "dfn",
  "div",
  "dl",
  "dt",
  "em",
  "fieldset",
  "figure",
  "footer",
  "form",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "head",
  "header",
  "hgroup",
  "hr",
  "i",
  "img",
  "input",
  "ins",
  "kbd",
  "keygen",
  "label",
  "layer",
  "legend",
  "li",
  "link",
  "map",
  "mark",
  "marquee",
  "meter",
  "multicol",
  "nav",
  "nobr",
  "noembed",
  "object",
  "ol",
  "optgroup",
  "option",
  "output",
  "p",
  "param",
  "pre",
  "progress",
  "q",
  "samp",
  "section",
  "select",
  "small",
  "spacer",
  "span",
  "strong",
  "style",
  "sub",
  "sup",
  "table",
  "tbody",
  "td",
  "textarea",
  "tfoot",
  "th",
  "thead",
  "time",
  "tr",
  "ul",
  "var",
  "video",
  "wbr",
];

function jsxIdentifier<T extends JSXReference>(name: T): T;
function jsxIdentifier(name: string): t.JSXIdentifier;
function jsxIdentifier(name: string | JSXReference): JSXReference;
function jsxIdentifier(name: string | JSXReference){
  return typeof name == "string"
    ? node("JSXIdentifier", { name })
    : name;
}

export function jsxElement(
  tag: string | t.JSXMemberExpression,
  props: (t.JSXSpreadAttribute | t.JSXAttribute)[],
  children: t.Expression[]
){
  const type = jsxIdentifier(tag);
  const content = children.map(jsxContent);
  const contains = content.length > 0;

  const openingElement = node("JSXOpeningElement", {
    name: type,
    attributes: props,
    selfClosing: !contains,
    typeParameters: null
  });

  const closingElement = contains
    ? node("JSXClosingElement", { name: type })
    : null;

  return node("JSXElement", {
    openingElement,
    closingElement,
    children: content,
    selfClosing: !contains
  });
}

function jsxContent(child: t.Expression){
  if(is(child, "JSXElement"))
    return child;

  if(is(child, "StringLiteral") && !/\{/.test(child.value))
    return node("JSXText", { value: child.value });

  return node("JSXExpressionContainer", { expression: child });
}

const IsLegalAttribute = /^[a-zA-Z_][\w-]*$/;

export function jsxAttribute(value: t.Expression, name?: string | false){
  if(typeof name !== "string")
    return node("JSXSpreadAttribute", { argument: value });

  if(IsLegalAttribute.test(name) == false)
    throw new Error(`Illegal characters in prop named ${name}`)

  const jsxValue = is(value, "StringLiteral")
    ? value.value === "true" ? null : value
    : node("JSXExpressionContainer", { expression: value })

  return node("JSXAttribute", {
    name: jsxIdentifier(name), value: jsxValue
  });
}