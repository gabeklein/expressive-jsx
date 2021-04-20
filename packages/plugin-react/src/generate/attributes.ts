import * as t from '@babel/types';
import { ExplicitStyle } from 'handle/attributes';

import type { ObjectProperty, SpreadElement, Expression } from '@babel/types';
import type { FlatValue } from 'types';

export function toExpression(value?: FlatValue | Expression){
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

export class ArrayStack<T = any, I = T>
  extends Array<T[] | I> {

  top?: T[] | I;

  insert(x: T){
     if(Array.isArray(this.top))
      this.top.push(x)
    else {
      this.top = [x]
      super.push(this.top)
    }
  }

  push(x: I): number {
    this.top = x;
    return super.push(x);
  }
}

export class AttributeStack
  extends ArrayStack<ExplicitStyle> {

  invariant = [] as ExplicitStyle[];

  insert(item: ExplicitStyle): boolean {
    if(item.name === undefined){
      this.top = item;
      this.push(item);
    }
    else if(item.invariant && this.length < 2){
      // this.invariant.push(item);
      return true;
    }
    else
      super.insert(item);

    return false;
  }

  flatten(){
    if(!this.length)
      return;

    if(this.length == 1 && this[0] instanceof ExplicitStyle)
      return this[0].expression;

    else {
      const chunks = [] as (ObjectProperty | SpreadElement)[];

      for(const item of this)
        if(item instanceof ExplicitStyle)
          chunks.push(t.spreadElement(item.expression))
        else
          chunks.push(...item.map(style =>
            t.objectProperty(
              t.stringLiteral(style.name!),
              style.expression
            )
          ));

      return t.objectExpression(chunks)
    }
  }
}
