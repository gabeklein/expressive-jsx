import { objectExpression, objectProperty, spreadElement, stringLiteral } from '@babel/types';
import { ExplicitStyle } from 'handle/attributes';

import type { ObjectProperty, SpreadElement} from '@babel/types';

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
      this.top = item
      this.push(item);
    }
    else
    if(item.invariant && this.length < 2){
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
          chunks.push(spreadElement(item.expression))
        else
          chunks.push(...item.map(style =>
            objectProperty(
              stringLiteral(style.name!),
              style.expression
            )
          ));

      return objectExpression(chunks)
    }
  }
}
