import { NodePath, Scope } from '@babel/traverse';
import { Function, Identifier, Node, ObjectProperty } from '@babel/types';

import { t } from '../types';

export function getProp(from: NodePath<Function>, name: string){
  let [props] = from.node.params;

  if (t.isObjectPattern(props)) {
    const { properties } = props;

    const prop = properties.find(x => (
      t.isObjectProperty(x) &&
      t.isIdentifier(x.key, { name })
    )) as ObjectProperty | undefined;

    if (prop)
      return prop.value as Identifier;

    const id = t.identifier(name);

    properties.unshift(t.objectProperty(id, id, false, true));

    return id;
  }
  else if (!props) {
    props = uniqueIdentifier(from.scope, "props");
    from.node.params.unshift(props);
  }

  if (t.isIdentifier(props))
    return t.memberExpression(props, t.identifier(name));

  throw new Error(`Expected an Identifier or ObjectPattern, got ${props.type}`);
}

export function getProps(from: NodePath<Function>){
  const { scope, node } = from;
  let [ props ] = node.params
  let output: Node | undefined;

  if(!props){
    node.params.push(output = uniqueIdentifier(scope, "props"));
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

export function uniqueIdentifier(scope: Scope, name = "temp") {
  let uid = name;
  let i = 0;

  do {
    if(i > 0) uid = name + i;
    i++;
  } while (
    scope.hasLabel(uid) ||
    scope.hasBinding(uid) ||
    scope.hasGlobal(uid) ||
    scope.hasReference(uid)
  );

  return t.identifier(uid);
}