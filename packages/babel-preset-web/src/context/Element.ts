import { NodePath } from '@babel/traverse';
import { Context } from './Context';

export class Element {
  using = new Set<Context>();

  constructor(
    public path: NodePath,
    public parent: Context | Element) {
  }

  use(name: string | Context){
    const used = new Set<Context>();
    const use = (context: Context) => {
      context.usedBy.add(this);
      this.using.add(context);
      used.add(context);
    }

    if(name instanceof Context)
      use(name);
    else
      for(let x: Element | Context = this; x; x = x.parent!)
        if(x instanceof Element)
          for(const ctx of x.using)
            ctx.get(name).forEach(use);
        else
          x.get(name).forEach(use);

    return used;
  }
}
