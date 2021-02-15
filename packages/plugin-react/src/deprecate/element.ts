import {
  isBinaryExpression,
  isExpression,
  isIdentifier,
  isLogicalExpression,
  isObjectMethod,
  isObjectProperty,
  isSequenceExpression,
  isSpreadElement,
  isStringLiteral,
  isTemplateLiteral,
  isUnaryExpression,
  stringLiteral,
} from '@babel/types';
import { ParseErrors } from 'errors';
import { ElementInline, ExplicitStyle, Prop } from 'handle';
import { applyNameImplications, applyPrimaryName } from 'parse';
import { inParenthesis } from 'shared';

import type {
  BinaryExpression,
  Expression,
  LogicalExpression,
  SpreadElement
} from '@babel/types';
import type { DoExpressive } from 'types';

type ListElement = Expression | SpreadElement;

const containsLineBreak = (text: string) => /\n/.test(text);

const Oops = ParseErrors({
  NoParenChildren: "Children in Parenthesis are not allowed, for direct insertion use an Array literal",
  SemicolonRequired: "Due to how parser works, a semicolon is required after the element preceeding escaped children.",
  DoExists: "Do Expression was already declared!",
  PropUnknown: "There is no property inferred from an {1}",
  AssignOnlyIdent: "Prop assignment only works on an identifier to denote name",
  PropNameMember: "Member Expressions can't be prop names",
  BadProp: "Bad Prop! + only works in conjuction with an Identifier, got {1}",
  BadOperator: "Props may only be assigned with `=` or using tagged templates.",
  BadUnary: "{1} is not a recognized operator for props",
  BadExpression: "Expression must start with an identifier",
  BadPrefix: "Improper element prefix",
  BadObjectKeyValue: "Object based props must have a value. Got {1}",
  PropNotIdentifier: "Prop name must be an Identifier",
  NotImplemented: "{1} Not Implemented",
  VoidArgsOverzealous: "Pass-Thru (void) elements can only receive styles through `do { }` statement.",
  BadShorthandProp: "\"+\" shorthand prop must be an identifier!",
  MethodPropNotAllowed: "Cannot transfer a method property; implement as normal property using an arrow function instead.",
  NestOperatorInEffect: "",
  UnrecognizedBinary: ""
})

export function addElementsFromExpression(
  subject: Expression,
  parent: ElementInline ){

  var attrs = [] as Expression[];

  if(isSequenceExpression(subject))
    [subject, ...attrs] = subject.expressions;

  if(isJustAValue(subject))
    return applyPassthru(subject, parent, attrs);
  else
    return parseLayers(subject, parent, attrs);
}

function isJustAValue(subject: any){
  if(subject.doNotTransform)
    return true;

  if(!isExpression(subject))
    return false;

  let leftOf: BinaryExpression | LogicalExpression | undefined;
  let target = subject;

  while(isBinaryExpression(target) || isLogicalExpression(target)){
    leftOf = target;
    target = target.left as Expression;;
  }

  if(isUnaryExpression(target, {operator: "void"})){
    if(leftOf)
      leftOf.left = target.argument;
    else
      Object.assign(target, target.argument);
    return true
  }

  if(isStringLiteral(target))
    return true

  return false;
}

function applyPassthru(
  subject: Expression,
  parent: ElementInline,
  baseAttributes: Expression[]
){
  const identifierName = isIdentifier(subject) && subject.name;
  const styleReference = "$" + identifierName;

  if(baseAttributes.length == 0){
    const hasModifiers = parent.context.elementMod(styleReference);
    if(identifierName && !hasModifiers){
      parent.adopt(subject);
      return subject
    }
  }
  else {
    const hasDoArgument = baseAttributes[0].type === "DoExpression";
    if(baseAttributes.length >= 2 || !hasDoArgument)
      throw Oops.VoidArgsOverzealous(subject)
  }

  const container = new ElementInline(parent.context);
  const elementType = isStringLiteral(subject) ? "string" : "void";

  applyNameImplications(container, elementType);

  if(identifierName){
    applyNameImplications(container, styleReference);
    container.name = identifierName;
  }

  container.explicitTagName = "div";
  container.adopt(subject);
  container.parent = parent;
  parent.adopt(container);

  parseProps(baseAttributes, container);

  return container;
}

function parseLayers(
  subject: Expression,
  parent: ElementInline,
  baseAttributes: Expression[],
  inSequence?: true
){
  const chain = [] as Expression[];
  let restAreChildren: true | undefined;
  let nestedExpression: Expression | undefined;
  let leftMost: ElementInline | undefined;

  if(isBinaryExpression(subject, {operator: ">"})){
    const { left, right } = subject;
    (<any>right).doNotTransform = true;
    nestedExpression = right;
    subject = left as Expression;
  }

  while(isBinaryExpression(subject)){
    const { operator } = subject;
    const rightHand = subject.right;
    const leftHand = subject.left;

    switch(operator){
      case ">>>":
        if(inSequence)
          throw Oops.NestOperatorInEffect(subject);

        restAreChildren = true
      break;

      case ">>":
        if(inParenthesis(rightHand))
          throw Oops.NoParenChildren(rightHand);
      break;

      default:
        throw Oops.UnrecognizedBinary(subject);
    }

    chain.unshift(rightHand);
    subject = leftHand as Expression;
  }
  chain.unshift(subject);

  for(const segment of chain){
    const child = new ElementInline(parent.context);

    parseIdentity(segment, child);

    if(!leftMost)
      leftMost = child;

    parent.adopt(child);
    child.parent = parent;
    parent = child;
  }

  if(restAreChildren){
    for(const child of baseAttributes)
      parseLayers(child, leftMost!, [], true);

    baseAttributes = nestedExpression ? [nestedExpression] : []
  }
  else if(nestedExpression)
    baseAttributes.unshift(nestedExpression);

  parseProps(baseAttributes, parent);
  return parent;
}

function parseIdentity(
  tag: Expression,
  target: ElementInline ){

  let prefix: string | undefined;

  if(isBinaryExpression(tag, {operator: "-"})){
    const left = tag.left;

    if(isIdentifier(left))
      prefix = left.name;
    else
      throw Oops.BadPrefix(left);
    tag = tag.right as any;
  }

  if(isUnaryExpression(tag, {operator: "!"})){
    prefix = "html"
    tag = tag.argument;
  }

  tag = unwrapExpression(tag, target);

  if(isIdentifier(tag))
    applyPrimaryName(target, tag.name, "div", prefix === "html");

  else if(isStringLiteral(tag) || isTemplateLiteral(tag)){
    applyNameImplications(target, "span", true);
    applyNameImplications(target, "string");

    target.add(tag)
  }

  else throw Oops.BadExpression(tag);
}

function unwrapExpression(
  expression: Expression,
  target: ElementInline
): Expression {

  while(!inParenthesis(expression))
  switch(expression.type){
    case "TaggedTemplateExpression": {
      let content: Expression = expression.quasi;
      const hasExpressions = content.expressions.length > 0;
      const hasLineBreak = containsLineBreak(content.quasis[0].value.cooked!);

      if(!hasExpressions && !hasLineBreak){
        const text = content.quasis[0].value.cooked!;
        content = stringLiteral(text);
      }

      target.add(content)

      expression = expression.tag;
      break;
    }

    case "CallExpression": {
      const exp = expression;
      const args = exp.arguments;
      parseProps(
        args as ListElement[],
        target
      );
      expression = exp.callee as any;
      break;
    }

    case "MemberExpression": {
      const selector = expression.property;
      if(expression.computed !== true && isIdentifier(selector))
        applyNameImplications(target, selector.name);
      else
        throw Oops.SemicolonRequired(selector)

      return expression.object;
      break;
    }

    default:
      return expression;
  }

  return expression;
}

function parseProps(
  props: ListElement[],
  target: ElementInline ){

  if(!props) return;
  for(let node of props){
    if(isJustAValue(node)){
      target.add(node as Expression)
      continue;
    }

    switch(node.type){
      case "DoExpression":
        (<DoExpressive>node).meta = target;
        target.doBlock = node as DoExpressive;
      break;

      case "TemplateLiteral":
      case "ArrowFunctionExpression":
        target.add(node)
      break;

      case "ArrayExpression": {
        for(const item of node.elements)
          if(isExpression(item))
            target.add(item);
      }
      break;

      case "TaggedTemplateExpression": {
        const {tag, quasi} = node;

        if(tag.type != "Identifier")
          throw Oops.PropNotIdentifier(node);

        const value = quasi.expressions.length == 0 ?
          stringLiteral(quasi.quasis[0].value.raw) :
          quasi;

        const prop = new Prop(tag.name, value);

        target.add(prop);
      } break;

      case "AssignmentExpression": {
        const name = node.left;
        const value = node.right;

        if(!isIdentifier(name))
          throw Oops.AssignOnlyIdent(name);

        target.add(new Prop(name.name, value));
      } break;

      case "Identifier": {
        const prop = new Prop(node.name, node);
        target.add(prop);
      } break;

      case "SpreadElement": {
        const prop = new Prop(false, node.argument);
        target.add(prop);
      } break;

      case "ObjectExpression": {
        for(const property of node.properties){
          let insert: Prop;

          if(isObjectProperty(property)){
            const { key, value } = property;
            const name = String(
              "value" in key && key.value || 
              "name" in key && key.name
            );

            if(!isExpression(value))
              throw Oops.BadObjectKeyValue(value, value.type);

            insert = new Prop(name, value)
          }

          else if(isSpreadElement(property))
            insert = new Prop(false, property.argument);

          else if(isObjectMethod(property))
            Oops.MethodPropNotAllowed(property);

          target.add(insert!)
        }
      } break;

      case "UnaryExpression": {
        const value = node.argument
        switch(node.operator){
          case "+":
            if(isIdentifier(value))
              target.add(
                new Prop(value.name, value)
              );
            else
              throw Oops.BadShorthandProp(node);
          break;

          case "-":
            target.add(
              new Prop("className", value)
            );
          break;

          case "~":
            target.add(
              new ExplicitStyle(false, value)
            );
          break
        }
      } break;

      default: {
        throw Oops.PropUnknown(node, node.type);
      }
    }
  }
}