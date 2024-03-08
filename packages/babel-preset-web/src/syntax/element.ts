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
}

/**
 * Obtain named prop from props object, first argument of a function.
 * If props does not exist, it will be created. If it is an ObjectPattern,
 * a rest element will be added to it. If prop exist in ObjectPattern, it
 * will be returned. If it does not exist, it will be prepended and returned.
 * If props is an Identifier, a MemberExpression will be returned where the
 * object is the props identifier and the property is the name of the prop.
 */
export function getProp(
  from: t.NodePath<t.Function>,
  name: string): t.MemberExpression | t.Identifier {
  
  let [ props ] = from.node.params;

  if(t.isObjectPattern(props)){
    const { properties } = props;

    const prop = properties.find(x => (
      t.isObjectProperty(x) &&
      t.isIdentifier(x.key, { name })
    )) as t.ObjectProperty | undefined;

    if(prop)
      return prop.value as t.Identifier;

    const id = t.identifier(name);

    properties.unshift(t.objectProperty(id, id, false, true));

    return id;
  }
  else if(!props){
    props = uniqueIdentifier(from.scope, "props");
    from.node.params.unshift(props);
  }
  
  if(t.isIdentifier(props))
    return t.memberExpression(props, t.identifier(name));

  throw new Error(`Expected an Identifier or ObjectPattern, got ${props.type}`);
}