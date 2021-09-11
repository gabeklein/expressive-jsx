import { toExpression } from 'generate/attributes';

import type { FlatValue } from 'types';

export abstract class Attribute {
  name?: string;
  value?: FlatValue | t.Expression;

  /** Is a static value. May be hoisted and/or baked. */
  invariant?: boolean;

  constructor(
    name: string | false,
    value: FlatValue | t.Expression){

    if(name)
      this.name = name;
    if(value !== undefined)
      this.value = value;
    if(value === null || typeof value !== "object")
      this.invariant = true
  }

  get expression(){
    return toExpression(this.value)
  }
}

export class Prop extends Attribute {}

export class ExplicitStyle extends Attribute {
  constructor(
    name: string | false,
    value: FlatValue | t.Expression | FlatValue[],
    public important = false){

    super(name, 
      Array.isArray(value) ? flatten(value) : value
    );
  }
}

const flatten = (content: FlatValue[]) => {
  const [ callee, ...args ] = content;

  return `${callee}(${args.join(" ")})`;
}