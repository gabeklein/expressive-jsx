import * as $ from 'syntax';

import type * as t from 'syntax/types';
import type { FlatValue } from 'types';
import type { ElementInline } from './definition';

export abstract class Attribute {
  name?: string;
  value?: FlatValue | t.Expression | ElementInline;

  constructor(
    name: string | false,
    value: FlatValue | t.Expression | ElementInline){

    if(name)
      this.name = name;
    if(value !== undefined)
      this.value = value;
  }

  get expression(){
    const { value } = this;

    if(value && typeof value == "object" && "toExpression" in value)
      return value.toExpression() || $.expression();

    return $.expression(value)
  }
}

export class Prop extends Attribute {}

export class ExplicitStyle extends Attribute {
  important: boolean;

  /** Is a static value. May be hoisted and/or baked. */
  invariant?: boolean;

  constructor(
    name: string | false,
    value: FlatValue | FlatValue[] | t.Expression,
    important?: boolean){

    if(Array.isArray(value))
      value = `${value[0]}(${value.slice(1).join(" ")})`;

    super(name, value);

    this.important = important || false;

    if(value === null || typeof value !== "object")
      this.invariant = true
  }
}