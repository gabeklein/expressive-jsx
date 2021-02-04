import {
  arrowFunctionExpression,
  blockStatement,
  BlockStatement,
  CallExpression,
  callExpression,
  Expression,
  Identifier,
  identifier,
  isArrayPattern,
  isBinaryExpression,
  isForInStatement,
  isForXStatement,
  isIdentifier,
  isObjectPattern,
  isVariableDeclaration,
  memberExpression,
  PatternLike,
  returnStatement,
} from '@babel/types';
import { ComponentFor, ElementInline, Prop } from 'handle';
import { ElementReact, ensureUIDIdentifier, GenerateReact } from 'internal';
import { SequenceItem } from 'types';

export class ElementIterate
  extends ElementReact<ComponentFor> {

  type: "ForOfStatement" | "ForInStatement" | "ForStatement";
  mayCollapseContent?: boolean;
  key?: Identifier;
  left?: PatternLike;
  right?: Expression;

  constructor(source: ComponentFor){
    super(source);
    this.type = source.node.type as any;
  }

  toExpression(Generator: GenerateReact): CallExpression {
    const wrapper =
      this.type === "ForInStatement"
      && memberExpression(identifier("Object"), identifier("keys"))

    return this.toMapExpression(Generator, wrapper)
  }

  willParse(sequence: SequenceItem[]){
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
      key = ensureUIDIdentifier(this.source.path.scope, "i");

    this.key = key;
    this.left = left;
    this.right = right;

    const inner = this.source.children;
    const [ element ] = inner;

    if(inner.length === 1
    && element instanceof ElementInline
    && element.props.key === undefined){
      element.insert(
        new Prop("key", this.key));
      this.mayCollapseContent = true;
    }

    return undefined
  }

  private elementOutput(
    Generator: GenerateReact
  ){
    let { key, mayCollapseContent } = this;

    if(this.props.length){
      let exists = this.props.find(
        x => x.name === "key"
      )

      if(!exists)
        this.props =
        this.props.concat({
          name: "key",
          value: key
        } as any)

      mayCollapseContent = true
    }

    return Generator.container(this, !mayCollapseContent && key);

  }

  private toMapExpression(
    Generator: GenerateReact,
    extractor?: Expression | false
  ): CallExpression {
    let { key } = this;
    let { left, right } = this;

    let body: BlockStatement | Expression =
      this.elementOutput(Generator)

    if(this.source.statements.length)
      body = blockStatement([
        ...this.source.statements,
        returnStatement(body)
      ])

    if(extractor){
      return callExpression(
        memberExpression(
          callExpression(extractor, [ right! ]),
          identifier("map")
        ),
        [ arrowFunctionExpression([left!], body) ]
      )
    }

    return callExpression(
      memberExpression(right!, identifier("map")),
      [ arrowFunctionExpression([left!, key!], body) ]
    )
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