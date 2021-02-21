import {
  booleanLiteral,
  identifier,
  isDoExpression,
  isIdentifier,
  nullLiteral,
  numericLiteral,
  stringLiteral,
} from '@babel/types';
import { ParseErrors } from 'errors';
import { ElementModifier } from 'handle';
import { applyModifier } from 'modifier';
import { meta } from 'shared';

import { parser } from './parse';

import type { Expression } from '@babel/types';
import type { StackFrame } from 'context';
import type { Modifier } from 'handle/modifier';
import type { ComponentIf } from 'handle/switch';
import type { BunchOf, FlatValue , SequenceItem } from 'types';
import type { ParserFor } from './parse';

const Oops = ParseErrors({
  AssignmentNotEquals: "Only `=` assignment may be used here.",
  BadInputModifier: "Modifier input of type {1} not supported here!",
  BadModifierName: "Modifier name cannot start with _ symbol!",
  DuplicateModifier: "Duplicate declaration of named modifier!",
  ExpressionUnknown: "Unhandled expressionary statement of type {1}",
  NodeUnknown: "Unhandled node of type {1}",
  PropNotIdentifier: "Assignment must be identifier name of a prop."
})

export abstract class AttributeBody {
  parse = parser(ParseAttributes);

  context: StackFrame
  name?: string;
  parent?: AttributeBody | ComponentIf;

  props = {} as BunchOf<Prop>;
  style = {} as BunchOf<ExplicitStyle>;
  sequence = [] as SequenceItem[];

  get uid(){
    const value = this.context.unique(this.name!)
    Object.defineProperty(this, "uid", { value });
    return value
  }

  abstract applyModifier(mod: Modifier): void;

  constructor(context: StackFrame){
    this.context = context.create(this);
  }

  wasAddedTo?<T extends AttributeBody>(element?: T): void;

  add(item: SequenceItem){
    this.sequence.push(item);

    if("wasAddedTo" in item && item.wasAddedTo)
      item.wasAddedTo(this);
  }

  addStyle(name: string, value: any){
    this.insert(
      new ExplicitStyle(name, value)
    )
  }

  insert(item: Prop | ExplicitStyle){
    const { name } = item;
    const register = item instanceof Prop
      ? this.props : this.style;

    if(name){
      const existing = register[name];

      if(existing)
        existing.overridden = true;

      register[name] = item;
    }

    this.add(item);
  }
}

export const ParseAttributes: ParserFor<AttributeBody> = {
  LabeledStatement(path){
    const body = path.get('body');
    const { name } = path.node.label;
    const { context } = this;

    if(name[0] == "_")
      throw Oops.BadModifierName(path)

    if(context.modifiers.has(name))
      throw Oops.DuplicateModifier(path);

    if(body.isExpressionStatement())
      applyModifier(name, this, body);

    else if(body.isBlockStatement() || body.isLabeledStatement())
      this.applyModifier(
        new ElementModifier(context, name, body)
      );

    else
      throw Oops.BadInputModifier(body, body.type)
  },

  AssignmentExpression({ node }){
    if(node.operator !== "=")
      throw Oops.AssignmentNotEquals(node)

    const { left, right } = node;

    if(!isIdentifier(left))
      throw Oops.PropNotIdentifier(left)

    const { name } = left;
    let prop: Prop;

    if(isDoExpression(right))
      prop = 
        meta(right).expressive_parent =
        new Prop(name, identifier("undefined"));
    else
      prop =
        new Prop(name, right)

    this.insert(prop);
  }
}

export abstract class Attribute<T extends Expression = Expression> {
  name?: string;
  value: FlatValue | T | undefined

  /** May be ignored; another style took its place. */
  overridden?: boolean;

  /** Is a static value. May be hoisted and/or baked. */
  invariant?: boolean;

  constructor(
    name: string | false,
    value: FlatValue | T){

    if(name)
      this.name = name;
    if(value !== undefined)
      this.value = value;
    if(value === null || typeof value !== "object")
      this.invariant = true
  }

  toExpression(){
    const { value } = this;
  
    switch(typeof value){
      case "string":
        return stringLiteral(value);
      case "number":
        return numericLiteral(value);
      case "boolean":
        return booleanLiteral(value);
      case "object":
        if(value === null)
          return nullLiteral();
        else
          return value;
      default:
        return identifier("undefined");
    }
  }
}

export class Prop extends Attribute {}

export class ExplicitStyle extends Attribute {
  constructor(
    name: string | false,
    value: FlatValue | Expression | FlatValue[],
    public important = false){

    super(name, flatten(value));

    function flatten(content: typeof value){
      if(Array.isArray(content)){
        const [ callee, ...args ] = content;
        return `${callee}(${args.join(" ")})`;
      }

      return content;
    }
  }
}