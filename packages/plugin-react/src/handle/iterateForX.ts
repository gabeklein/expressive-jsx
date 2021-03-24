import {
  arrowFunctionExpression,
  blockStatement,
  isArrayPattern,
  isBinaryExpression,
  isIdentifier,
  isObjectPattern,
  isVariableDeclaration,
  returnStatement,
} from '@babel/types';
import { ParseErrors } from 'errors';
import { generateElement } from 'generate';
import { ElementInline } from 'handle';
import { ParseForLoop, parser } from 'parse';
import { _call, _get, _objectKeys } from 'syntax';

import { Prop } from './attributes';

import type { NodePath as Path } from '@babel/traverse';
import type {
  BlockStatement,
  Expression,
  ForInStatement,
  ForOfStatement,
  ForXStatement,
  Identifier,
  Statement
} from '@babel/types';

const Oops = ParseErrors({
  BadForOfAssignment: "Assignment of variable left of \"of\" must be Identifier or Destruture",
  BadForInAssignment: "Left of ForInStatement must be an Identifier here!"
})

export class ComponentForX extends ElementInline {
  node: ForXStatement;
  parse = parser(ParseForLoop);

  constructor(
    public path: Path<ForInStatement> | Path<ForOfStatement>,
    element: ElementInline){

    super(element.context);

    this.node = path.node as ForXStatement;
    this.handleBody(
      path.get("body") as Path<Statement>
    );

    element.adopt(this);
  }

  toExpression(){
    const { body, left, right, key } = this.getReferences();
    
    if(this.path.isForOfStatement())
      return _call(
        _get(right!, "map"),
        arrowFunctionExpression([left!, key!], body)
      )
    else
      return _call(
        _get(_objectKeys(right!), "map"),
        arrowFunctionExpression([left!], body)
      )
  }

  protected ensureKeyProp(key: Identifier){
    const { children, sequence } = this;
    const [ element ] = children;

    const props = sequence.filter(x => x instanceof Prop) as Prop[];

    if(props.find(x => x.name === "key"))
      return;

    const keyProp = new Prop("key", key);

    if(children.length == 1 && props.length == 0)
      if(element instanceof ElementInline){
        const exists = element.sequence.find(x =>
          x instanceof Prop && x.name === "key"
        );

        if(!exists)
          element.add(keyProp);

        return;
      }

    this.add(keyProp);
  }

  protected getReferences(){
    let { left, right } = this.node as ForXStatement;
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

    if(this.path.isForOfStatement())
      key = this.context.Imports.ensureUIDIdentifier("i");
    else if(isIdentifier(left))
      key = left
    else 
      throw Oops.BadForInAssignment(left);

    this.ensureKeyProp(key);

    const body = this.toReturnExpression();

    return { left, right, body, key }
  }

  protected toReturnExpression(){
    const compiled = generateElement(this);
    
    let body: BlockStatement | Expression = 
      this.context.Imports.container(compiled);

    if(this.statements.length)
      body = blockStatement([
        ...this.statements,
        returnStatement(body)
      ])
    
    return body;
  }
}