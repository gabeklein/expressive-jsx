import { Context, DefineContext } from './context';
import { addClassName } from './syntax/className';
import { getProp, setTagName } from './syntax/element';
import * as t from './types';

export class ElementContext extends Context {
  using = new Set<DefineContext>();
  node: t.JSXElement;

  constructor(
    public parent: Context,
    public path: t.NodePath<t.JSXElement>){

    const opening = path.get("openingElement");
    let name = opening.get("name");

    super(path, parent);

    this.node = path.node;

    while(name.isJSXMemberExpression()){
      this.use(name.get("property").toString());
      name = name.get("object");
    }

    if(name.isJSXIdentifier())
      this.use(name.toString());

    opening.get("attributes").forEach(attr => {
      if(!attr.isJSXAttribute() || attr.node.value)
        return;

      let { name } = attr.node.name;
    
      if(typeof name !== "string")
        name = name.name;

      const applied = this.use(name);
      
      if(applied.length)
        attr.remove();
    });
  }

  get this(){
    const { component } = this;

    if(component && component.usedBy.has(this))
      return component;
  }

  get(name: string){
    const mods = new Set<DefineContext>();

    for(const ctx of [this.parent!, ...this.using])
      ctx.get(name).forEach(x => mods.add(x));

    return Array.from(mods);
  }

  use(name: string){
    const applied = this.get(name);

    applied.forEach(context => {
      context.usedBy.add(this);
      this.using.add(context);
    });

    return applied;
  }

  setTagName(to: string){
    setTagName(this.node, to);
  }

  getProp(named: string){
    return getProp(this.node, named);
  }

  addClassName(name: string | t.Expression){
    return addClassName(this.path, name);
  }
}