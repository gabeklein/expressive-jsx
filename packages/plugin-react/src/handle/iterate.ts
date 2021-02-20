import { isForXStatement, isIdentifier, isVariableDeclaration } from '@babel/types';
import { ComponentContainer } from 'handle';

import type { For } from '@babel/types';
import type { StackFrame } from 'context';
import type { ForPath } from 'types';

export class ComponentFor extends ComponentContainer {
  node: For

  constructor(
    public path: ForPath,
    context: StackFrame){

    super(context);

    this.node = path.node
    this.name = this.generateName();
    this.doBlock = this.handleContentBody(path.node.body);
  }

  private generateName(){
    const { node } = this;

    if(isForXStatement(node)){
      let { left } = node;
      const { right } = node;
      const name = [];

      if(isVariableDeclaration(left))
        left = left.declarations[0].id;

      if(isIdentifier(left))
        name.push(left.name);

      name.push(node.type == "ForInStatement" ? "in" : "of");

      if(isIdentifier(right))
        name.push(right.name);

      return name.reduce(
        (acc, w) => acc + w[0].toUpperCase() + w.slice(1),
        "for"
      )
    }
    else
      return "for"
  }

  AssignmentExpression(){
    throw new Error("For block cannot accept Assignments");
  }

  Prop(){
    void 0
  }
}