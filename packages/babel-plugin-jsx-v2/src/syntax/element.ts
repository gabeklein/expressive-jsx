import * as t from "../types";
import { uniqueIdentifier } from './unique';

export function setTagName(
  element: t.NodePath<t.JSXElement> | t.JSXElement,
  tagName: string){

  if(element instanceof t.NodePath)
    element = element.node;

  const { openingElement, closingElement } = element;
  const tag = t.jsxIdentifier(tagName);

  openingElement.name = tag;

  if(closingElement)
    closingElement.name = tag;
}

export function forwardProps(
  jsxElement: t.NodePath<t.JSXElement>){

  const parent = jsxElement.findParent(x => x.isFunction()) as t.NodePath<t.Function>;
  let [ props ] = parent.node.params;
  let spreadProps;

  if(!props){
    props = uniqueIdentifier(jsxElement.scope, "props");
    parent.node.params.unshift(props);
    spreadProps = props;
  }
  else if(t.isObjectPattern(props)){
    spreadProps = uniqueIdentifier(jsxElement.scope, "rest");
    props.properties.push(t.restElement(spreadProps));
  }

  if(t.isIdentifier(spreadProps))
    jsxElement.node.openingElement.attributes.push(
      t.jsxSpreadAttribute(spreadProps)
    );

  return props;
}

export function extractClassName(
  props: t.Node,
  scope: t.Scope){

  if(t.isIdentifier(props))
    return t.memberExpression(props, t.identifier("className"));

  if(!t.isObjectPattern(props))
    throw new Error(`Expected an ObjectPattern or Identifier, got ${props.type}`);

  let classNameProp = props.properties.find(x => (
    t.isObjectProperty(x) &&
    t.isIdentifier(x.key, { name: "className" })
  )) as t.ObjectProperty | undefined;

  if(!classNameProp){
    const id = uniqueIdentifier(scope, "className");

    classNameProp = id.name === "className"
      ? t.objectProperty(id, id, false, true)
      : t.objectProperty(t.identifier("className"), id);
      
    props.properties.unshift(classNameProp);
  }

  const { value } = classNameProp;

  if(!t.isExpression(value))
    throw new Error(`Cannot get className from ${value.type}`);

  return value;
}

export function fixImplicitReturn(path: t.NodePath<t.Expression>) {
  const statement = path.parentPath;
  const block = statement.parentPath!;

  if (!block.isBlockStatement())
    return;

  const within = block.parentPath as t.NodePath;
  const inserted = block.node.body.length === 1 &&
    within.isArrowFunctionExpression()
    ? block.replaceWith(t.parenthesizedExpression(path.node))
    : statement.replaceWith(t.returns(path.node));

  inserted[0].skip();
}
