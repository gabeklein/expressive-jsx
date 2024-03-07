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

export function forwardFunctionProps(element: t.NodePath<t.JSXElement>){
  const parentFunc = element.findParent(x => x.isFunction()) as t.NodePath<t.Function>;
  let [ props ] = parentFunc.node.params;
  let spreadProps;

  if(!props){
    props = uniqueIdentifier(element.scope, "props");
    parentFunc.node.params.unshift(props);
    spreadProps = props;
  }
  else if(t.isObjectPattern(props)){
    spreadProps = uniqueIdentifier(element.scope, "rest");
    props.properties.push(t.restElement(spreadProps));
  }

  if(t.isIdentifier(spreadProps))
    element.node.openingElement.attributes.push(
      t.jsxSpreadAttribute(spreadProps)
    );

  return props;
}

export function extractProperty(
  props: t.Node,
  scope: t.Scope,
  name: string){

  if(t.isIdentifier(props))
    return t.memberExpression(props, t.identifier(name));

  if(!t.isObjectPattern(props))
    throw new Error(`Expected an ObjectPattern or Identifier, got ${props.type}`);

  let classNameProp = props.properties.find(x => (
    t.isObjectProperty(x) &&
    t.isIdentifier(x.key, { name })
  )) as t.ObjectProperty | undefined;

  if(!classNameProp){
    const id = uniqueIdentifier(scope, name);

    classNameProp = id.name === name
      ? t.objectProperty(id, id, false, true)
      : t.objectProperty(t.identifier(name), id);
      
    props.properties.unshift(classNameProp);
  }

  const { value } = classNameProp;

  if(!t.isExpression(value))
    throw new Error(`Cannot get className from ${value.type}`);

  return value;
}