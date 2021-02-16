import {
  booleanLiteral,
  identifier,
  isBlockStatement,
  isExpressionStatement,
  isLabeledStatement,
  nullLiteral,
  numericLiteral,
  stringLiteral,
} from '@babel/types';
import { ParseErrors } from 'errors';
import { ElementModifier, TraversableBody } from 'handle';
import { applyModifier } from 'modifier';

import type { Expression, LabeledStatement } from '@babel/types';
import type { Modifier } from 'handle/modifier';
import type { BunchOf, FlatValue } from 'types';

const Oops = ParseErrors({
  ExpressionUnknown: "Unhandled expressionary statement of type {1}",
  NodeUnknown: "Unhandled node of type {1}",
  BadInputModifier: "Modifier input of type {1} not supported here!",
  BadModifierName: "Modifier name cannot start with _ symbol!",
  DuplicateModifier: "Duplicate declaration of named modifier!"
})

export abstract class AttributeBody extends TraversableBody {

  props = {} as BunchOf<Prop>;
  style = {} as BunchOf<ExplicitStyle>;

  abstract ElementModifier(mod: Modifier): void;

  get uid(){
    const value = this.context.unique(this.name!)
    Object.defineProperty(this, "uid", { value });
    return value
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

  LabeledStatement(
    node: LabeledStatement,
    _path: any,
    applyTo: Modifier = this as any){

    const body = node.body;
    const { name } = node.label;
    const { context } = this;

    if(name[0] == "_")
      throw Oops.BadModifierName(node)

    if(context.modifiers.has(name))
      throw Oops.DuplicateModifier(node);

    if(isExpressionStatement(body))
      applyModifier(name, applyTo, body);
      
    // const handler = applyTo.context.propertyMod(name);
    // if(handler && (isBlockStatement(body) || isLabeledStatement(body)))
    //   applyModifier(name, applyTo, body);

    else if(isBlockStatement(body) || isLabeledStatement(body))
      applyTo.ElementModifier(
        new ElementModifier(context, name, body)
      );

    else
      throw Oops.BadInputModifier(body, body.type)
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