import { NodePath as Path } from '@babel/traverse';
import {
  AssignmentExpression,
  BlockStatement,
  blockStatement,
  DebuggerStatement,
  doExpression,
  Expression,
  expressionStatement,
  For,
  FunctionDeclaration,
  identifier,
  IfStatement,
  isDoExpression,
  isIdentifier,
  JSXElement,
  JSXMemberExpression,
  Statement,
  UnaryExpression,
  UpdateExpression,
  VariableDeclaration,
} from '@babel/types';
import { ParseErrors } from 'errors';
import { Attribute, AttributeBody, ComponentFor, ComponentIf, ElementModifier, ExplicitStyle, Modifier, Prop } from 'handle';
import { addElementsFromExpression, applyNameImplications, StackFrame } from 'parse';
import { addElementFromJSX } from 'parse/jsx';
import { inParenthesis } from 'shared';
import { DoExpressive, InnerContent } from 'types';

const Oops = ParseErrors({
  PropNotIdentifier: "Assignment must be identifier name of a prop.",
  AssignmentNotEquals: "Only `=` assignment may be used here.",
  BadShorthandProp: "\"+\" shorthand prop must be an identifier!",
  UnrecognizedUnary: "Unary Expression {1} not recognized.",
  UnarySpaceRequired: "Unary Expression must include a space between {1} and the value.",
  StatementInElement: "Statement insertion not implemented while within elements!",
  MinusMinusNotImplemented: "-- is not implemented as an integration statement."
})

export class ElementInline extends AttributeBody {
  doBlock?: DoExpressive
  primaryName?: string;
  children = [] as InnerContent[];
  explicitTagName?: string | JSXMemberExpression;
  modifiers = [] as Modifier[];

  adopt(child: InnerContent){
    const index = this.children.push(child);

    if("context" in child && child.context instanceof StackFrame)
      child.context.resolveFor(index);

    this.add(child);
  }

  didExitOwnScope(path: Path<DoExpressive>){
    this.context.pop(this);
  }

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
    const { doBlock } = element;

    this.adopt(element)
    if(doBlock)
      path.replaceWith(doBlock)
  }

  BlockStatement(node: BlockStatement, path: Path<BlockStatement>){
    const blockElement = new ElementInline(this.context);
    const block = blockStatement(node.body);
    const doExp = doExpression(block) as DoExpressive;

    applyNameImplications(blockElement, "block");
    this.add(blockElement)

    blockElement.doBlock = doExp;
    doExp.meta = blockElement;
    path.replaceWith(
      expressionStatement(doExp)
    )
  }

  UpdateExpression(node: UpdateExpression){
    const value = node.argument;
    const op = node.operator;

    if(node.start !== value.start! - 3)
      throw Oops.UnarySpaceRequired(node, op)

    if(op !== "++")
      throw Oops.MinusMinusNotImplemented(node)

    this.add(
      new Prop(false, value)
    )
  }

  UnaryExpression(node: UnaryExpression){
    const value = node.argument;
    const op = node.operator

    switch(op){
      case "delete":
        this.ExpressionAsStatement(value);
        return

      case "void":
      case "!":
        this.ExpressionDefault(node)
        return
    }

    if(node.start !== value.start! - 2)
      throw Oops.UnarySpaceRequired(node, op);

    let insert: Attribute;

    switch(op){
      case "+":
        if(!isIdentifier(value))
          throw Oops.BadShorthandProp(node);
        insert = new Prop(value.name, value);
      break;

      case "-":
        insert = new Prop("className", value);
      break;

      case "~":
        insert = new ExplicitStyle(false, value);
      break;

      default:
        throw Oops.UnrecognizedUnary(node, op);
    }

    this.add(insert);
  }

  ExpressionAsStatement(node: Expression){
    throw Oops.StatementInElement(node)
  }

  AssignmentExpression(node: AssignmentExpression){
    if(node.operator !== "=")
      throw Oops.AssignmentNotEquals(node)

    let { left, right } = node;

    if(!isIdentifier(left))
      throw Oops.PropNotIdentifier(left)

    let { name } = left;

    if(isDoExpression(right)){
      const prop = new Prop(name, identifier("undefined"));
      (<DoExpressive>right).expressive_parent = prop;
      this.insert(prop);
    }

    else
      this.insert(new Prop(name, right));
  }
}

export class ComponentContainer extends ElementInline {
  statements = [] as Statement[];

  ExpressionAsStatement(node: Expression){
    const stat = expressionStatement(node);
    this.statements.push(stat);
  }

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