import { Context, DefineContext } from './context';
import { createContext } from './label';
import { onExit } from './plugin';
import { getName } from './syntax/names';
import { t } from './types';

import type { NodePath } from '@babel/traverse';
import type { Expression, IfStatement, StringLiteral } from '@babel/types';

export function handleSwitch(parent: NodePath<IfStatement>){
  const ambient = createContext(parent) as DefineContext;
  const context = parent.get("test").isStringLiteral()
    ? new SelectorContext(ambient, parent)
    : new IfContext(ambient, parent);

  onExit(parent, (key, path) => {
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
  selects: string;
  
  constructor(
    public parent: DefineContext,
    public path: NodePath<IfStatement>){

    const test = path.node.test as StringLiteral;

    super(test.value, parent, path);
    parent.dependant.push(this);
    this.selects = test.value;
  }

  get selector(){
    return this.parent.selector + this.selects;
  }

  get className(){
    return this.parent!.className;
  }

  add(child: DefineContext){
    child.within = this;
    super.add(child);
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

    if(!alternate)
      return t.logicalExpression("&&", test, t.stringLiteral(uid));

    let alt = alternate.className!;

    if(typeof alt === "string")
      alt = t.stringLiteral(alt);

    return t.conditionalExpression(test, t.stringLiteral(uid), alt);
  }

  add(child: DefineContext){
    child.within = this;
    super.add(child);
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