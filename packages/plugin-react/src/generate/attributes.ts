import { ExplicitStyle } from 'handle/attributes';
import * as t from 'syntax';
import { ArrayStack } from 'utility';

import type { ObjectProperty, SpreadElement, Expression } from 'syntax';
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
