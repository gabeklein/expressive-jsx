import { ExplicitStyle } from 'handle/attributes';
import * as t from 'syntax';
import { ArrayStack } from 'utility';

import type { FlatValue } from 'types';

export function toExpression(value?: FlatValue | t.Expression){
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

  exists = new Set<string>();
  invariant = new Set<ExplicitStyle>();

  insert(
    item: ExplicitStyle,
    inline_only?: boolean){

    const { name } = item;

    if(name === undefined){
      this.top = item;
      this.push(item);
      return;
    }

    if(this.exists.has(name))
      return;
    
    this.exists.add(name);

    if(item.invariant && !inline_only)
      this.invariant.add(item);
    else
      super.insert(item);
  }

  flatten(){
    if(!this.length)
      return;

    if(this.length == 1 && this[0] instanceof ExplicitStyle)
      return this[0].expression;

    else {
      const chunks = [] as (t.ObjectProperty | t.SpreadElement)[];

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
