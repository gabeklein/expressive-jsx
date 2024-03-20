import { NodePath } from '@babel/traverse';
import { IfStatement } from '@babel/types';

import { createContext } from '../label';
import { onExit } from '../plugin';
import { getName } from '../syntax/names';
import t from '../types';
import { Define } from './Define';

export class Contingent extends Define {
  condition: Expression;
  alternate?: Define;
  parent: Define;
  
  constructor(
    public path: NodePath<IfStatement>){

    const test = path.node.test;
    const name = t.isIdentifier(test) ? test.name : getName(path);
    const parent = createContext(path) as Define;

    super(name, parent, path);

    this.condition = test;
    this.parent = parent;

    if(t.isStringLiteral(test)){
      parent.dependant.add(this);
      this.selector = parent.selector + test.value;
    }
    else
      parent.also.add(this);

    onExit(path, (path, key) => {
      if(key == "alternate" || this.alternate)
        return;

      if(!path.removed)
        path.remove();
    });
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