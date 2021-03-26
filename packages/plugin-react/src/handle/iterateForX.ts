import {
  arrowFunctionExpression,
  blockStatement,
  isArrayPattern,
  isBinaryExpression,
  isForOfStatement,
  isIdentifier,
  isObjectPattern,
  isVariableDeclaration,
  returnStatement,
} from '@babel/types';
import { ParseErrors } from 'errors';
import { generateElement } from 'generate';
import { ElementInline } from 'handle';
import { parse, ParseForLoop } from 'parse';
import { _call, _get, _objectKeys } from 'syntax';

import { Prop } from './attributes';

import type { NodePath as Path } from '@babel/traverse';
import type {
  ForInStatement,
  ForOfStatement,
  ForXStatement,
  Identifier
} from '@babel/types';

const Oops = ParseErrors({
  BadForOfAssignment: "Assignment of variable left of \"of\" must be Identifier or Destruture",
  BadForInAssignment: "Left of ForInStatement must be an Identifier here!"
})

export class ComponentForX extends ElementInline {
  node: ForXStatement;

  constructor(
    public path: Path<ForInStatement> | Path<ForOfStatement>,
    parent: ElementInline){

    super(parent.context);

    this.node = path.node as ForXStatement;
    parse(this, ParseForLoop, path, "body");

    parent.adopt(this);
  }

  toExpression(){
    const { left, right, key } = this.getReferences();

    this.ensureKeyProp(key);

    const body = this.toReturnExpression();
    
    if(this.path.isForOfStatement())
      return _call(
        _get(right, "map"),
        arrowFunctionExpression([left, key], body)
      )
    else
      return _call(
        _get(_objectKeys(right), "map"),
        arrowFunctionExpression([left], body)
      )
  }

  protected ensureKeyProp(key: Identifier){
    const { children, sequence } = this;

    const props = sequence.filter(x => x instanceof Prop) as Prop[];

    if(props.find(x => x.name === "key"))
      return;

    const keyProp = new Prop("key", key);

    if(children.length == 1 && props.length == 0){
      const element = children[0];

      if(element instanceof ElementInline){
        const exists = element.sequence.find(x =>
          x instanceof Prop && x.name === "key"
        );

        if(!exists)
          element.add(keyProp);

        return;
      }
    }

    this.add(keyProp);
  }

  protected getReferences(){
    const { context, node } = this;
    let { left, right } = node;
    let key: Identifier;

    if(isVariableDeclaration(left))
      left = left.declarations[0].id;

    if(isIdentifier(left) || isObjectPattern(left) || isArrayPattern(left))
      void 0;
    else
      throw Oops.BadForOfAssignment(left);

    if(isBinaryExpression(right, {operator: "in"})){
      key = right.left as Identifier
      right = right.right;
    }

    if(isForOfStatement(node))
      key = context.Imports.ensureUIDIdentifier("i");
    else if(isIdentifier(left))
      key = left
    else 
      throw Oops.BadForInAssignment(left);

    return { left, right, key }
  }

  protected toReturnExpression(){
    const { context, statements } = this;
    const compiled = generateElement(this);
    
    let output = 
      context.Imports.container(compiled);

    if(statements.length)
      return blockStatement([
        ...statements,
        returnStatement(output)
      ])
    
    return output;
  }
}