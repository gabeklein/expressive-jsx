import * as s from 'syntax';

import type * as t from 'syntax/types';
import type { FlatValue } from 'types';
import type { ElementInline } from './element';

export abstract class Attribute {
  name?: string;
  value?: FlatValue | t.Expression | ElementInline;

  /** Is a static value. May be hoisted and/or baked. */
  invariant?: boolean;

  constructor(
    name: string | false,
    value: FlatValue | t.Expression | ElementInline){

    if(name)
      this.name = name;
    if(value !== undefined)
      this.value = value;
    if(value === null || typeof value !== "object")
      this.invariant = true
  }

  get expression(){
    const { value } = this;

    if(value && typeof value == "object" && "toExpression" in value)
      return value.toExpression() || s.expression();
    
    return s.expression(value)
  }
}

export class Prop extends Attribute {}

export class ExplicitStyle extends Attribute {
  constructor(
    name: string | false,
    value: FlatValue | FlatValue[] | t.Expression,
    public important = false){

    super(name, 
      Array.isArray(value) ? flatten(value) : value
    );
  }
}

const flatten = ([ callee, ...args ]: FlatValue[]) => {
  return `${callee}(${args.join(" ")})`;
}