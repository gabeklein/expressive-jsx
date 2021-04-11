import {
  arrowFunctionExpression,
  blockStatement,
  expressionStatement,
  forStatement,
  isArrayPattern,
  isBinaryExpression,
  isForInStatement,
  isIdentifier,
  isObjectPattern,
  isVariableDeclaration,
  returnStatement,
} from '@babel/types';
import { ParseErrors } from 'errors';
import { ElementInline } from 'handle';
import { parse, ParseForLoop } from 'parse';
import { _call, _get, _objectKeys } from 'syntax';

import { Prop } from './attributes';
import { DefineElement } from './modifier';

import type { NodePath as Path } from '@babel/traverse';
import type {
  ForStatement,
  Statement,
  ForInStatement,
  ForOfStatement,
  Identifier ,
  BlockStatement,
  Expression
} from '@babel/types';
import type { StackFrame } from 'context';
import type { Element } from './element';

const Oops = ParseErrors({
  BadForOfAssignment: "Assignment of variable left of \"of\" must be Identifier or Destruture",
  BadForInAssignment: "Left of ForInStatement must be an Identifier here!"
})

export class ComponentFor {
  context!: StackFrame;
  definition: DefineElement;

  constructor(
    private path: Path<ForStatement>,
    parent: Element){

    const element = new DefineElement(parent.context, "forLoop");
    parse(element, ParseForLoop, path, "body");

    this.definition = element;

    parent.context.push(this);
    parent.adopt(this);
  }

  toExpression(){
    const { init, test, update } = this.path.node;
    const { statements } = this.definition;

    const output = this.definition.toExpression();
    const scope = this.context.Imports;
    const accumulator = scope.ensureUIDIdentifier("add");
    const collect = scope.ensure("$runtime", "collect");

    let body: Statement =
      expressionStatement(
        _call(accumulator, output)
      );

    if(statements.length)
      body = blockStatement([ ...statements, body ]);

    return _call(collect, 
      arrowFunctionExpression(
        [accumulator], blockStatement([
          forStatement(init, test, update, body)
        ])
      )  
    )
  }
}

export class ComponentForX {
  context!: StackFrame;
  definition: DefineElement;

  constructor(
    private path: Path<ForInStatement> | Path<ForOfStatement>,
    parent: Element){

    const name = path.type.replace("Statement", "Loop");
    const element = this.definition =
      new DefineElement(parent.context, name);

    parse(element, ParseForLoop, path, "body");

    parent.context.push(this);
    parent.adopt(this);
  }

  toExpression(){
    const { definition, path } = this;
    const { left, right, key } = this.getReferences();

    let body: Expression | BlockStatement = 
      definition.toExpression(true);

    if(definition.statements.length)
      body = blockStatement([
        ...definition.statements,
        returnStatement(body)
      ])
    
    if(path.isForOfStatement()){
      const params = key ? [left, key] : [left];

      return _call(
        _get(right, "map"),
        arrowFunctionExpression(params, body)
      )
    }
    else
      return _call(
        _get(_objectKeys(right), "map"),
        arrowFunctionExpression([left], body)
      )
  }

  protected ensureKeyProp(key?: Identifier){
    let target = this.definition;
    const scope = this.context.Imports;

    const props = target.sequence.filter(x => x instanceof Prop) as Prop[];

    for(const x of props)
      if(x.name === "key")
        return;

    if(target.children.length == 1 && props.length == 0){
      const element = target.children[0];

      if(element instanceof ElementInline){
        for(const x of element.sequence)
          if(x instanceof Prop && x.name === "key")
            return;
        
        target = element as any;
      }
    }

    if(!key)
      key = scope.ensureUIDIdentifier("i");

    target.add(new Prop("key", key));

    return key;
  }

  protected getReferences(){
    const { node } = this.path;
    let { left, right } = node;
    let key: Identifier | undefined;

    if(isVariableDeclaration(left))
      left = left.declarations[0].id;

    if(isIdentifier(left) || isObjectPattern(left) || isArrayPattern(left))
      void 0;
    else
      throw Oops.BadForOfAssignment(left);

    if(isBinaryExpression(right, { operator: "in" })){
      key = right.left as Identifier;
      right = right.right;
    }

    if(isForInStatement(node))
      if(isIdentifier(left))
        key = left;
      else
        throw Oops.BadForInAssignment(left);

    key = this.ensureKeyProp(key);

    return { left, right, key }
  }
}