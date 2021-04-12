import * as t from '@babel/types';
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

  const { scope } = parent.exec;
  const props = getProps(target, parent.exec);

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
    const id = scope.hasBinding(name)
      ? scope.generateUidIdentifier(name)
      : t.identifier(name);

    props.properties.push(
      t.objectProperty(t.identifier(name), id, false, id.name == name)
    )
    
    return id;
  }
}

function getProps(
  target: DefineElement,
  exec: Path<ArrowFunctionExpression>){

  const { node } = exec;
  let props = node.params[0];
  
  if(!t.isObjectPattern(props)){
    const existing = props;
    props = t.objectPattern([]);

    if(!existing)
      node.params[0] = props;

    else if(t.isIdentifier(existing)){
      const init = t.variableDeclaration("const", [
        t.variableDeclarator(props, existing)
      ]);

      target.statements.push(init);
    }
  }

  return props;
}