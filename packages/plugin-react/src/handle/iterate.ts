import { ParseErrors } from 'errors';
import { Prop } from 'handle/attributes';
import { DefineElement } from 'handle/definition';
import { ElementInline } from 'handle/element';
import { parse } from 'parse/body';
import * as t from 'syntax';

import type {
  ForStatement,
  Statement,
  ForInStatement,
  ForOfStatement,
  Identifier ,
  BlockStatement,
  Expression,
  Path
} from 'syntax';
import type { StackFrame } from 'context';

const Oops = ParseErrors({
  BadForOfAssignment: "Assignment of variable left of \"of\" must be Identifier or Destruture",
  BadForInAssignment: "Left of ForInStatement must be an Identifier here!",
  PropsNotAllowed: "For block cannot accept prop assignments"
});

export class ComponentFor {
  context!: StackFrame;
  definition: DefineElement;

  constructor(
    private path: Path<ForStatement>,
    parent: DefineElement){

    const element = new DefineElement(parent.context, "forLoop");
    parse(element, path, "body");

    this.definition = element;

    parent.context.push(this);
    parent.adopt(this);
  }

  toExpression(){
    const { node } = this.path;
    const { statements } = this.definition;

    const output = this.definition.toExpression();

    if(!output)
      return;

    const scope = this.context.Scope;
    const accumulator = scope.ensureUIDIdentifier("add");
    const collect = scope.ensure("$runtime", "collect");

    let body: Statement =
      t.expressionStatement(
        t.call(accumulator, output)
      );

    if(statements.length)
      body = t.blockStatement([ ...statements, body ]);

    node.body = body;

    return t.call(collect, 
      t.arrowFunctionExpression(
        [accumulator], t.blockStatement([ node ])
      )  
    )
  }
}

export class ComponentForX {
  context!: StackFrame;
  definition: DefineElement;

  constructor(
    private path: Path<ForInStatement> | Path<ForOfStatement>,
    parent: DefineElement){

    const name = path.type.replace("Statement", "Loop");
    const element = this.definition =
      new DefineElement(parent.context, name);

    parse(element, path, "body");

    parent.context.push(this);
    parent.adopt(this);
  }

  toExpression(){
    const { definition, path } = this;
    const { left, right, key } = this.getReferences();

    let body: Expression | BlockStatement | undefined = 
      definition.toExpression();

    if(!body)
      return;

    if(definition.statements.length)
      body = t.blockStatement([
        ...definition.statements,
        t.returnStatement(body)
      ])
    
    if(path.isForOfStatement()){
      const params = key ? [left, key] : [left];

      return t.call(
        t.get(right, "map"),
        t.arrowFunctionExpression(params, body)
      )
    }
    else
      return t.call(
        t.get(t.objectKeys(right), "map"),
        t.arrowFunctionExpression([left], body)
      )
  }

  protected ensureKeyProp(key?: Identifier){
    let target = this.definition;
    const scope = this.context.Scope;

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

    if(t.isVariableDeclaration(left))
      left = left.declarations[0].id;

    if(t.isIdentifier(left) || t.isObjectPattern(left) || t.isArrayPattern(left))
      void 0;
    else
      throw Oops.BadForOfAssignment(left);

    if(t.isBinaryExpression(right, { operator: "in" })){
      key = right.left as Identifier;
      right = right.right;
    }

    if(t.isForInStatement(node))
      if(t.isIdentifier(left))
        key = left;
      else
        throw Oops.BadForInAssignment(left);

    key = this.ensureKeyProp(key);

    return { left, right, key }
  }
}