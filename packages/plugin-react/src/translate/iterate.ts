import {
  arrowFunctionExpression,
  blockStatement,
  isArrayPattern,
  isBinaryExpression,
  isForInStatement,
  isForXStatement,
  isIdentifier,
  isObjectPattern,
  isVariableDeclaration,
  returnStatement,
} from '@babel/types';
import { ElementInline, Prop } from 'handle';
import { _call, _get, _objectKeys } from 'syntax';
import { ElementReact } from 'translate';

import type {
  BlockStatement,
  CallExpression,
  Expression,
  Identifier,
  PatternLike
} from '@babel/types';
import type { StackFrame } from 'context';
import type { ComponentFor } from 'handle/iterate';
import type { ExternalsManager } from 'regenerate/scope';

export class ElementIterate extends ElementReact<ComponentFor> {
  private mayCollapseContent?: boolean;
  private key?: Identifier;
  private left?: PatternLike;
  private right?: Expression;

  toExpression({ Imports }: StackFrame): CallExpression {
    const { key, left, right } = this;
    const { statements, node } = this.source;

    let body: BlockStatement | Expression =
      this.elementOutput(Imports)

    if(statements.length)
      body = blockStatement([
        ...statements,
        returnStatement(body)
      ])

    if(isForInStatement(node))
      return _call(
        _get(_objectKeys(right!), "member"),
        arrowFunctionExpression([left!], body)
      )
    else
      return _call(
        _get(right!, "map"),
        arrowFunctionExpression([left!, key!], body)
      )
  }

  willParse(){
    const { node } = this.source;

    if(!isForXStatement(node))
      return

    let key: Identifier;
    let { left, right } = node;

    if(isVariableDeclaration(left))
      left = left.declarations[0].id;

    if(isIdentifier(left) || isObjectPattern(left) || isArrayPattern(left))
      void 0;
    else
      throw new Error("Assignment of variable left of \"of\" must be Identifier or Destruture")

    if(isBinaryExpression(right, {operator: "in"})){
      key = right.left as Identifier
      right = right.right;
    }

    if(isIdentifier(left))
      key = left
    else if(isForInStatement(node))
      throw new Error("Left of ForInStatement must be an Identifier here!")
    else
      key = this.source.context.Imports.ensureUIDIdentifier("i");

    this.key = key;
    this.left = left;
    this.right = right;

    const inner = this.source.children;
    const [ element ] = inner;

    if(inner.length === 1
    && element instanceof ElementInline
    && element.props.key === undefined){
      this.mayCollapseContent = true;
      element.insert(
        new Prop("key", this.key)
      );
    }
  }

  private elementOutput(generate: ExternalsManager){
    let { key, mayCollapseContent } = this;

    if(this.props.length){
      const exists =
        this.props.find(x => x.name === "key");

      if(!exists)
        this.props.push({ name: "key", value: key! });

      mayCollapseContent = true;
    }

    if(mayCollapseContent)
      key = undefined;

    return generate.container(this, key);
  }

  /*
  private toInvokedForLoop(Generator: GenerateReact){
    const accumulator = ensureUIDIdentifier(this.source.path.scope, "acc");
    const sourceLoop = this.source.node;
    const content = this.elementOutput(Generator);

    sourceLoop.body = blockStatement([
      ...this.source.statements,
      expressionStatement(
        callExpression(
          memberExpression(
            accumulator,
            identifier("push")
          ),
          [ content ]
        )
      )
    ])

    return IIFE([
      declare("const", accumulator, arrayExpression()),
      sourceLoop,
      returnStatement(accumulator)
    ])
  }
  */
}