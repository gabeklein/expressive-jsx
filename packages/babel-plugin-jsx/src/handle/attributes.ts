import { t } from 'syntax';

import type * as $ from 'types';
import type { ElementInline } from './definition';

export abstract class Attribute {
  name?: string;
  value?: $.FlatValue | $.Expression | ElementInline;

  constructor(
    name: string | false,
    value: $.FlatValue | $.Expression | ElementInline){

    if(name)
      this.name = name;
    if(value !== undefined)
      this.value = value;
  }

  get expression(){
    const { value } = this;

    if(value && typeof value == "object" && "toExpression" in value)
      return value.toExpression() || t.expression();

    return t.expression(value)
  }
}

export class Style extends Attribute {
  important: boolean;

  /** Is a static value. May be hoisted and/or baked. */
  invariant?: boolean;

  constructor(
    name: string | false,
    value: $.FlatValue | $.FlatValue[] | $.Expression,
    important?: boolean){

    if(Array.isArray(value))
      value = `${value[0]}(${value.slice(1).join(" ")})`;

    super(name, value);

    this.important = important || false;

    if(value === null || typeof value !== "object")
      this.invariant = true
  }
}

export class Prop extends Attribute {}