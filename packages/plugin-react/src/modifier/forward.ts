import {
  blockStatement,
  identifier,
  isBlockStatement,
  isIdentifier,
  isObjectPattern,
  objectPattern,
  objectProperty,
  returnStatement,
  variableDeclaration,
  variableDeclarator,
} from '@babel/types';
import { DefineElement, Prop } from 'handle';

import type { NodePath as Path } from '@babel/traverse';
import type { ArrowFunctionExpression } from '@babel/types';
import type { ModifyDelegate } from './delegate';

const find = (from: Array<any>, item: any) => from.indexOf(item) >= 0;

export function forward(this: ModifyDelegate, ...args: any[]){
  const target = this.target;
  const parent = target.context.currentComponent;

  if(!(target instanceof DefineElement))
    throw new Error("Can only forward props to another element");

  if(!parent)
    throw new Error("No parent component found in hierarchy");

  if(!parent.exec)
    throw new Error("Can only apply props from a parent `() => do {}` function!");

  const { exec } = parent;
  const { scope } = exec;
  const props = getProps(exec);

  const all = find(args, "all");

  if(all || find(args, "children"))
    target.adopt(
      getFromProps("children")
    )

  for(const prop of ["className", "style"])
    if(all || find(args, prop))
      target.add(
        new Prop(prop, getFromProps(prop))
      )

  function getFromProps(name: string){
    const id = scope.generateUidIdentifier(name);

    props.properties.push(
      objectProperty(identifier(name), id, false, id.name == name)
    )
    
    return id;
  }
}

function getProps(fn: Path<ArrowFunctionExpression>){
  const { node } = fn;
  let props = node.params[0];
  
  if(!isObjectPattern(props)){
    const existing = props;
    props = objectPattern([]);

    if(!existing)
      node.params[0] = props;

    else if(isIdentifier(existing)){
      const { body } = node;
      const init = variableDeclaration("const", [
        variableDeclarator(props, existing)
      ]);

      if(isBlockStatement(body))
        body.body.unshift(init);
      else
        node.body = blockStatement([
          init, returnStatement(body)
        ])
    }
  }

  return props;
}