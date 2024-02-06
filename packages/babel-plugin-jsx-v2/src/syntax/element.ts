import * as t from '../types';
import { HTML_TAGS, SVG_TAGS } from './tags';
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
  parent: t.NodePath<t.Function>,
  jsxElement: t.NodePath<t.JSXElement>){

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

/*
  TODO: Replace with modifiers for all
  real tags which sets tagName explicitly
*/
export function hasProperTagName(element: t.NodePath<t.JSXElement>){
  const tag = element.node.openingElement.name;

  if(!t.isJSXIdentifier(tag))
    return true;

  const { name } = tag;

  if(HTML_TAGS.includes(name))
    return true;

  if(SVG_TAGS.includes(name)){
    let parent: t.NodePath | null = element;
      
    while(parent = parent.parentPath){
      if(parent.isFunction())
        break;

      if(parent.isJSXElement() && t.isJSXIdentifier(parent.node.openingElement.name, { name: "svg" }))
        return true;
    }
  }

  return false;
}