import { blockStatement, identifier, isDoExpression, isIdentifier } from '@babel/types';
import { addElementsFromExpression, handleBlockStatement, handleUnaryExpression, handleUpdateExpression } from 'deprecate';
import { ParseErrors } from 'errors';
import { AttributeBody, ComponentFor, ComponentIf, Prop } from 'handle';
import { addElementFromJSX } from 'parse';
import { inParenthesis } from 'shared';

import type { NodePath as Path } from '@babel/traverse';
import type {
  AssignmentExpression,
  BlockStatement,
  DebuggerStatement,
  Expression,
  For,
  FunctionDeclaration,
  IfStatement,
  JSXElement,
  JSXMemberExpression,
  Statement,
  UnaryExpression,
  UpdateExpression,
  VariableDeclaration
} from '@babel/types';
import type { ElementModifier, Modifier } from 'handle';
import type { DoExpressive, InnerContent } from 'types';

const Oops = ParseErrors({
  PropNotIdentifier: "Assignment must be identifier name of a prop.",
  AssignmentNotEquals: "Only `=` assignment may be used here."
})

export class ElementInline extends AttributeBody {
  doBlock?: DoExpressive
  primaryName?: string;
  children = [] as InnerContent[];
  explicitTagName?: string | JSXMemberExpression;
  modifiers = [] as Modifier[];

  adopt(child: InnerContent){
    const index = this.children.push(child);

    if("context" in child)
      child.context.resolveFor(index);

    this.add(child);
  }

  didExitOwnScope(path: Path<DoExpressive>){}

  ExpressionDefault(node: Expression){
    if(inParenthesis(node))
      this.adopt(node)
    else
      addElementsFromExpression(node, this);
  }

  JSXElement(node: JSXElement){
    addElementFromJSX(node, this);
  }

  ElementModifier(mod: ElementModifier){
    this.context.elementMod(mod);
  }

  IfStatement(_: IfStatement, path: Path<IfStatement>){
    const mod = new ComponentIf(path, this.context);

    this.adopt(mod)
    path.replaceWith(
      blockStatement(mod.doBlocks!)
    )
  }

  ForInStatement(_: For, path: Path<For>){
    this.ForStatement(_, path)
  }

  ForOfStatement(_: For, path: Path<For>){
    this.ForStatement(_, path)
  }

  ForStatement(_: For, path: Path<For>){
    const element = new ComponentFor(path, this.context);

    this.adopt(element)
    if(element.doBlock)
      path.replaceWith(element.doBlock)
  }

  BlockStatement(node: BlockStatement, path: Path<BlockStatement>){
    handleBlockStatement.call(this, node, path)
  }

  UpdateExpression(node: UpdateExpression){
    handleUpdateExpression.call(this, node);
  }

  UnaryExpression(node: UnaryExpression){
    handleUnaryExpression.call(this, node);
  }

  AssignmentExpression(node: AssignmentExpression){
    if(node.operator !== "=")
      throw Oops.AssignmentNotEquals(node)

    let { left, right } = node;

    if(!isIdentifier(left))
      throw Oops.PropNotIdentifier(left)

    let { name } = left;
    let prop: Prop;

    if(isDoExpression(right))
      prop = 
        (<DoExpressive>right).expressive_parent =
        new Prop(name, identifier("undefined"));
    else
      prop =
        new Prop(name, right)

    this.insert(prop);
  }
}

export class ComponentContainer extends ElementInline {
  statements = [] as Statement[];

  VariableDeclaration(node: VariableDeclaration){
    this.statements.push(node);
  }

  DebuggerStatement(node: DebuggerStatement){
    this.statements.push(node);
  }

  FunctionDeclaration(node: FunctionDeclaration){
    this.statements.push(node);
  }
}