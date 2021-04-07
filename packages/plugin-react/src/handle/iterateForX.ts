import {
  arrowFunctionExpression,
  blockStatement,
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

import type { NodePath as Path } from '@babel/traverse';
import type {
  ForInStatement,
  ForOfStatement,
  Identifier
} from '@babel/types';
import type { StackFrame } from 'context';
import type { Element } from './element';
import { DefineElement } from './modifier';

const Oops = ParseErrors({
  BadForOfAssignment: "Assignment of variable left of \"of\" must be Identifier or Destruture",
  BadForInAssignment: "Left of ForInStatement must be an Identifier here!"
})

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
    const { left, right, key } = this.getReferences();

    const body = this.toReturnExpression();
    
    if(this.path.isForOfStatement()){
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

    if(props.find(x => x.name === "key"))
      return;

    if(target.children.length == 1 && props.length == 0){
      const element = target.children[0];

      if(element instanceof ElementInline){
        const exists = element.sequence.find(x =>
          x instanceof Prop && x.name === "key"
        );

        if(exists)
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

  protected toReturnExpression(){
    const element = this.definition;

    let output = element.toExpression(true);

    if(element.statements.length)
      return blockStatement([
        ...element.statements,
        returnStatement(output)
      ])
    
    return output;
  }
}