import { NodePath } from '@babel/traverse';
import { Function, Identifier, Node, ObjectProperty } from '@babel/types';

import t from '../types';
import { uniqueIdentifier } from './names';

export function getProp(path: NodePath<Function>, name: string){
  const { node, scope } = path;
  let [props] = node.params;

  if(t.isObjectPattern(props)){
    const { properties } = props;

    const prop = properties.find(x => (
      t.isObjectProperty(x) &&
      t.isIdentifier(x.key, { name })
    )) as ObjectProperty | undefined;

    if(prop)
      return prop.value as Identifier;

    const id = t.identifier(name);

    properties.unshift(
      t.objectProperty(id, id, false, true)
    );

    return id;
  }
  else if(!props){
    props = uniqueIdentifier(scope, "props");
    node.params.unshift(props);
  }

  if(t.isIdentifier(props))
    return t.memberExpression(props, t.identifier(name));

  throw new Error(`Expected an Identifier or ObjectPattern, got ${props.type}`);
}

export function getProps(path: NodePath<Function>){
  const { scope, node: { params } } = path;
  let [ props ] = params
  let output: Node | undefined;

  if(!props){
    params.push(output = uniqueIdentifier(scope, "props"));
  }
  else if(t.isObjectPattern(props)){
    const existing = props.properties.find(x => t.isRestElement(x));

    if(t.isRestElement(existing))
      output = existing.argument;

    const inserted = t.restElement(uniqueIdentifier(scope, "rest"));
    
    props.properties.push(inserted)

    output = inserted.argument;
  }
  else
    output = props;

  if(t.isIdentifier(output))
    return output;

  throw new Error("Could not extract props from function.")
}