import { Style } from 'handle/attributes';
import { ArrayStack } from 'utility';
import * as $ from 'syntax';

import type * as t from 'syntax/types';

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

    const chunks = [] as (t.ObjectProperty | t.SpreadElement)[];

    for(const item of this)
      if(item instanceof Style)
        chunks.push($.spread(item.expression))
      else
        chunks.push(...item.map(style =>
          $.property(style.name!, style.expression)
        ));

    return $.object(chunks)
  }
}
