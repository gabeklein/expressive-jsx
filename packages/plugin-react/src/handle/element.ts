import { blockStatement, identifier, isDoExpression, isIdentifier } from '@babel/types';
import { ParseErrors } from 'errors';
import { AttributeBody, ComponentFor, ComponentIf, Prop } from 'handle';
import { addElementFromJSX } from 'parse';

import type { NodePath as Path } from '@babel/traverse';
import type {
  AssignmentExpression,
  DebuggerStatement,
  For,
  FunctionDeclaration,
  IfStatement,
  JSXElement,
  JSXMemberExpression,
  Statement,
  VariableDeclaration
} from '@babel/types';
import type { ElementModifier, Modifier } from 'handle/modifier';
import type { DoExpressive, ForPath, InnerContent } from 'types';

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

  didExitOwnScope(){
    void 0;
  }

  JSXElement(node: JSXElement){
    addElementFromJSX(node, this);
  }

  applyModifier(mod: ElementModifier){
    this.context.elementMod(mod);
  }

  IfStatement(_: IfStatement, path: Path<IfStatement>){
    const mod = new ComponentIf(path, this.context);

    this.adopt(mod)
    path.replaceWith(
      blockStatement(mod.doBlocks!)
    )
  }

  ForInStatement(_: For, path: ForPath){
    this.ForStatement(_, path)
  }

  ForOfStatement(_: For, path: ForPath){
    this.ForStatement(_, path)
  }

  ForStatement(_: For, path: ForPath){
    const element = new ComponentFor(path as any, this.context);

    this.adopt(element)
    if(element.doBlock)
      path.replaceWith(element.doBlock)
  }

  AssignmentExpression(node: AssignmentExpression){
    if(node.operator !== "=")
      throw Oops.AssignmentNotEquals(node)

    const { left, right } = node;

    if(!isIdentifier(left))
      throw Oops.PropNotIdentifier(left)

    const { name } = left;
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