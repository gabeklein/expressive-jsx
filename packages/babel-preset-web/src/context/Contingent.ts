import { NodePath } from '@babel/traverse';
import { Expression, IfStatement } from '@babel/types';

import { createContext } from '../label';
import { onExit } from '../plugin';
import { getName } from '../syntax/names';
import t from '../types';
import { Define } from './Define';

export class Contingent extends Define {
  condition: Expression;
  alternate?: Define;
  
  constructor(
    public path: NodePath<IfStatement>){

    const test = path.node.test;
    const name = t.isIdentifier(test) ? test.name : getName(path);
    const parent = createContext(path) as Define;

    super(name, parent, path);

    this.condition = test;

    if(t.isStringLiteral(test)){
      parent.dependant.add(this);
      this.selector = parent.selector + test.value;
    }
    else
      parent.also.add(this);

    onExit(path, (path, key) => {
      if(key == "conseqent" && this.alternate)
        return;
  
      if(!path.removed)
        path.remove();
    });
  }

  get className(){
    const { condition, alternate, uid } = this;

    if(t.isStringLiteral(condition))
      return;

    const value = t.stringLiteral(uid);

    if(!alternate)
      return t.logicalExpression("&&", condition, value);

    let alt = alternate.className!;

    if(typeof alt === "string")
      alt = t.stringLiteral(alt);

    return t.conditionalExpression(condition, value, alt);
  }

  has(child: Define){
    child.selector = this.selector + " " + child.selector;
  }

  for(key: unknown){
    if(key === "alternate"){
      let { alternate, parent, name, path } = this;

      if(!alternate){
        alternate = new Define("not_" + name, parent, path);
        this.alternate = alternate;
        this.dependant.add(alternate);
      }

      return alternate;
    }

    return this;
  }
}