import {
  arrowFunctionExpression,
  BlockStatement,
  blockStatement,
  CallExpression,
  Expression,
  Identifier,
  isArrayPattern,
  isBinaryExpression,
  isForInStatement,
  isForXStatement,
  isIdentifier,
  isObjectPattern,
  isVariableDeclaration,
  PatternLike,
  returnStatement,
} from '@babel/types';
import { StackFrame } from 'context';
import { ComponentFor, ElementInline, Prop } from 'handle';
import { GenerateReact } from 'regenerate';
import { _call, _get, _objectKeys } from 'syntax';
import { ElementReact } from 'translate';

export class ElementIterate extends ElementReact<ComponentFor> {
  type: "ForOfStatement" | "ForInStatement" | "ForStatement";
  mayCollapseContent?: boolean;
  key?: Identifier;
  left?: PatternLike;
  right?: Expression;

  constructor(source: ComponentFor){
    super(source);
    this.type = source.node.type as any;
  }

  toExpression({ Generator }: StackFrame): CallExpression {
    let { key, left, right, source: { statements }, type } = this;

    let body: BlockStatement | Expression =
      this.elementOutput(Generator)

    if(statements.length)
      body = blockStatement([
        ...statements,
        returnStatement(body)
      ])

    if(type === "ForInStatement")
      return (
        _call(
          _get(_objectKeys(right!), "member"),
          arrowFunctionExpression([left!], body)
        )
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

    if(isIdentifier(left)
    || isObjectPattern(left)
    || isArrayPattern(left))
      void 0;
    else
      throw new Error("Assignment of variable left of \"of\" must be Identifier or Destruture")

    if(isBinaryExpression(right, {operator: "in"})){
      key = right.left as Identifier
      right = right.right as any;
    }
    else if(isForInStatement(node) && isIdentifier(left)){
      if(isIdentifier(left))
        key = left
      else
        throw new Error("Left of ForInStatement must be an Identifier here!")
    }
    else
      key = this.context.Imports.ensureUIDIdentifier("i");

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
    };
  }

  private elementOutput(Generator: GenerateReact){
    let { key, mayCollapseContent } = this;

    if(this.props.length){
      let exists =
        this.props.find(x => x.name === "key");

      if(!exists)
        this.props.push({ name: "key", value: key! });

      mayCollapseContent = true;
    }

    if(mayCollapseContent)
      key = undefined;

    return Generator.container(this, key);
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