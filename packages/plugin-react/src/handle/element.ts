import { blockStatement } from '@babel/types';
import { AttributeBody, ComponentFor, ComponentIf } from 'handle';
import { addElementFromJSX } from 'parse';

import type { NodePath as Path } from '@babel/traverse';
import type {
  DebuggerStatement,
  DoExpression,
  For,
  FunctionDeclaration,
  IfStatement,
  JSXElement,
  JSXMemberExpression,
  Statement,
  VariableDeclaration
} from '@babel/types';
import type { ElementModifier, Modifier } from 'handle/modifier';
import type { ForPath, InnerContent } from 'types';

export class ElementInline extends AttributeBody {
  doBlock?: DoExpression
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

  applyModifier(mod: ElementModifier){
    this.context.elementMod(mod);
  }

  JSXElement(node: JSXElement){
    addElementFromJSX(node, this);
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