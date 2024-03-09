import * as t from "../types";
import { uniqueIdentifier } from './unique';

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

  let [props] = from.node.params;

  if (t.isObjectPattern(props)) {
    const { properties } = props;

    const prop = properties.find(x => (
      t.isObjectProperty(x) &&
      t.isIdentifier(x.key, { name })
    )) as t.ObjectProperty | undefined;

    if (prop)
      return prop.value as t.Identifier;

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

export function getRestProps(element: t.NodePath<t.Function>){
  let [ props ] = element.get("params");
  let output: t.NodePath | undefined;

  if(!props){
    [ output ] = element.pushContainer("params", uniqueIdentifier(element.scope, "props"));
  }
  else if(props.isObjectPattern()){
    const existing = props.get("properties").find(x => x.isRestElement());

    if(existing && existing.isRestElement())
      output = existing.get("argument");

    const [ inserted ] = props.pushContainer("properties", 
      t.restElement(uniqueIdentifier(element.scope, "rest"))
    )

    output = inserted.get("argument");
  }

  if(output && output.isIdentifier())
    return output;

  throw new Error("Could not extract props from function.")
}