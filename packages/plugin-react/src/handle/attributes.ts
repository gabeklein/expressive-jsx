import * as t from '@babel/types';

import type { Expression } from '@babel/types';
import type { FlatValue } from 'types';

export abstract class Attribute<T extends Expression = Expression> {
  name?: string;
  value: FlatValue | T | undefined

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

  get expression(){
    const { value } = this;
  
    switch(typeof value){
      case "string":
        return t.stringLiteral(value);
      case "number":
        return t.numericLiteral(value);
      case "boolean":
        return t.booleanLiteral(value);
      case "object":
        if(value === null)
          return t.nullLiteral();
        else
          return value;
      default:
        return t.identifier("undefined");
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