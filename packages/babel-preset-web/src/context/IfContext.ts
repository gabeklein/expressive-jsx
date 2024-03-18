import { NodePath } from '@babel/traverse';
import { Expression, IfStatement, StringLiteral } from '@babel/types';

import { createContext } from '../label';
import { onExit } from '../plugin';
import { getName } from '../syntax/names';
import t from '../types';
import { Context } from './Context';
import { DefineContext } from './DefineContext';

export function handleSwitch(parent: NodePath<IfStatement>){
  const ambient = createContext(parent) as DefineContext;
  const context = parent.get("test").isStringLiteral()
    ? new SelectorContext(ambient, parent)
    : new IfContext(ambient, parent);

  onExit(parent, (path, key) => {
    if(key == "conseqent"
    && context instanceof IfContext
    && context.alternate)
      return;

    if(!path.removed)
      path.remove();
  });

  return context;
}

export class SelectorContext extends DefineContext {
  constructor(
    public parent: DefineContext,
    public path: NodePath<IfStatement>){

    const test = path.node.test as StringLiteral;

    super(test.value, parent, path);
    parent.dependant.push(this);
    this.selector = this.parent.selector + test.value;
  }

  get className(){
    return this.parent!.className;
  }

  has(child: DefineContext){
    child.selector = this.selector + " " + child.selector;
  }
}

export class IfContext extends DefineContext {
  test: Expression;
  alternate?: DefineContext;
  
  constructor(
    public parent: Context,
    public path: NodePath<IfStatement>){

    const test = path.node.test;
    const name = t.isIdentifier(test) ? test.name : getName(path);

    super(name, parent, path);

    this.test = test;

    if(t.isIdentifier(test))
      this.name = test.name;

    if(parent instanceof DefineContext)
      parent.also.add(this);
  }

  get className(){
    const { test, alternate, uid } = this;
    const value = t.stringLiteral(uid);

    if(!alternate)
      return t.logicalExpression("&&", test, value);

    let alt = alternate.className!;

    if(typeof alt === "string")
      alt = t.stringLiteral(alt);

    return t.conditionalExpression(test, value, alt);
  }

  has(child: DefineContext){
    child.selector = this.selector + " " + child.selector;
  }

  for(key: unknown){
    if(key === "consequent")
      return this;

    let { alternate, parent, name, path } = this;

    if(!alternate){
      alternate = new DefineContext("not_" + name, parent, path);
      this.alternate = alternate;
      this.dependant.push(alternate);
    }

    return alternate;
  }
}