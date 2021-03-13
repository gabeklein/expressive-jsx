import {
  arrowFunctionExpression,
  blockStatement,
  doExpression,
  isArrayPattern,
  isBinaryExpression,
  isBlockStatement,
  isForInStatement,
  isIdentifier,
  isObjectPattern,
  isVariableDeclaration,
  returnStatement,
} from '@babel/types';
import { ParseErrors } from 'errors';
import { ElementInline } from 'handle';
import { ParseForLoop, parser } from 'parse';
import { generateElement } from 'generate';
import { meta } from 'shared';
import { _call, _get, _objectKeys } from 'syntax';

import { Prop } from './attributes';

import type { Statement, Identifier, BlockStatement, Expression, ForXStatement } from '@babel/types';
import type { ForPath } from 'types';

const Oops = ParseErrors({
  BadForOfAssignment: "Assignment of variable left of \"of\" must be Identifier or Destruture",
  BadForInAssignment: "Left of ForInStatement must be an Identifier here!"
})

class ComponentForX extends ElementInline {
  node: ForXStatement;
  statements = [] as Statement[];
  parse = parser(ParseForLoop);

  constructor(
    public path: ForPath,
    element: ElementInline){

    super(element.context);

    this.node = path.node as ForXStatement;
    this.handleContentBody(path.node.body);

    element.adopt(this);

    if(this.doBlock)
      path.replaceWith(this.doBlock);
  }

  private handleContentBody(content: Statement){
    if(!isBlockStatement(content))
      content = blockStatement([content])

    const body = doExpression(content);
    meta(body, this);
    this.doBlock = body;
  }

  ensureKeyProp(key: Identifier){
    const { children, props } = this;
    const [ element ] = children;
  
    if(props.key)
      return;

    if(children.length == 1 && Object.keys(props).length == 0)
      if(element instanceof ElementInline){
        if(element.props.key === undefined)
          element.insert(new Prop("key", key));
        return;
      }

    this.insert(new Prop("key", key));
  }

  getReferences(){
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

    if(isForInStatement(this.node)){
      if(isIdentifier(left))
        key = left
      else 
        throw Oops.BadForInAssignment(left);
    }
    else
      key = this.context.Imports.ensureUIDIdentifier("i");

    return { left, right, key }
  }

  toReturnExpression(){
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

export class ComponentForOf extends ComponentForX {
  name = "forOfLoop";

  toExpression(){
    const { left, right, key } = this.getReferences();
    
    this.ensureKeyProp(key);
    
    const body = this.toReturnExpression();

    return _call(
      _get(right!, "map"),
      arrowFunctionExpression([left!, key!], body)
    )
  }
}

export class ComponentForIn extends ComponentForX {
  name = "forInLoop";

  toExpression(){
    const { left, right, key } = this.getReferences();

    this.ensureKeyProp(key);

    const body = this.toReturnExpression();

    return _call(
      _get(_objectKeys(right!), "map"),
      arrowFunctionExpression([left!], body)
    )
  }
}