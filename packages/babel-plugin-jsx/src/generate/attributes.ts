import { Style } from 'handle/attributes';
import * as t from 'syntax';
import { ArrayStack } from 'utility';

import type * as $ from 'types';

export class AttributeStack extends ArrayStack<Style> {
  exists = new Set<string>();
  invariant = new Set<Style>();

  insert(
    item: Style,
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

    if(this.length == 1 && this[0] instanceof Style)
      return this[0].expression;

    const chunks = [] as ($.ObjectProperty | $.SpreadElement)[];

    for(const item of this)
      if(item instanceof Style)
        chunks.push(t.spreadElement(item.expression))
      else
        chunks.push(...item.map(style =>
          t.property(style.name!, style.expression)
        ));

    return t.object(chunks)
  }
}
