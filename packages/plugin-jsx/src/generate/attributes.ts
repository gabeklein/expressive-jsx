import { ExplicitStyle } from 'handle/attributes';
import { ArrayStack } from 'utility';
import * as s from 'syntax';

import type * as t from 'syntax/types';

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
          chunks.push(s.spreadElement(item.expression))
        else
          chunks.push(...item.map(style => 
            s.property(style.name!, style.expression)
          ));

      return s.objectExpression(chunks)
    }
  }
}
