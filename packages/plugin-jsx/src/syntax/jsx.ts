import { is, node } from './nodes';

import type * as t from './types';

type JSXReference = t.JSXIdentifier | t.JSXMemberExpression;

export type JSXChild =
  | t.JSXElement
  | t.JSXFragment
  | t.JSXExpressionContainer
  | t.JSXSpreadChild
  | t.JSXText;

/** HTML Tags may collide with casual use. */
// "address"
// "area"
// "article"
// "aside"
// "base"
// "button"
// "caption"
// "code"
// "command"
// "comment"
// "datalist"
// "details"
// "figure"
// "footer"
// "form"
// "header"
// "keygen"
// "label"
// "layer"
// "legend"
// "link"
// "map"
// "mark"
// "meter"
// "object"
// "option"
// "output"
// "param"
// "progress"
// "section"
// "select"
// "spacer"
// "time"
// "video"

export const LITERAL_TAGS = [
  "a",
  "abbr",
  "audio",
  "b",
  "big",
  "bdo",
  "bgsound",
  "blink",
  "blockquote",
  "br",
  "canvas",
  "cite",
  "col",
  "colgroup",
  "dd",
  "del",
  "dfn",
  "div",
  "dl",
  "dt",
  "em",
  "fieldset",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "hgroup",
  "hr",
  "i",
  "img",
  "input",
  "ins",
  "kbd",
  "li",
  "marquee",
  "multicol",
  "nav",
  "nobr",
  "noembed",
  "ol",
  "optgroup",
  "p",
  "pre",
  "q",
  "samp",
  "small",
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
  "tr",
  "ul",
  "var",
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