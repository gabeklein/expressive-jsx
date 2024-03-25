import { NodePath } from '@babel/traverse';
import { Context } from './Context';

export class Element {
  using = new Set<Context>();

  constructor(
    public path: NodePath,
    public parent: Context | Element) {
  }

  get(name: string){
    const mods = new Set<Context>();

    for(const ctx of [this.parent!, ...this.using])
      ctx.get(name).forEach(x => mods.add(x));

    return Array.from(mods);
  }

  use(name: string | Context) {
    const apply = typeof name == "string"
      ? this.get(name) : [name];

    apply.forEach(context => {
      context.usedBy.add(this);
      this.using.add(context);
    });

    return apply;
  }
}
