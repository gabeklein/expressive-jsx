import { NodePath } from '@babel/traverse';
import { JSXElement } from '@babel/types';

import { Context } from './Context';
import { Define } from './Define';

export class Element extends Context {
  using = new Set<Define>();
  path!: NodePath<JSXElement>;

  get(name: string){
    const mods = new Set<Define>();

    for(const ctx of [this.parent!, ...this.using])
      ctx.get(name).forEach(x => mods.add(x));

    return Array.from(mods);
  }

  use(name: string | Define){
    const apply = typeof name == "string"
      ? this.get(name) : [name];

    apply.forEach(context => {
      context.usedBy.add(this);
      this.using.add(context);
    });

    return apply;
  }
}