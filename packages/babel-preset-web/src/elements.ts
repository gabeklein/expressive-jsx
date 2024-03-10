import { Context, DefineContext } from './context';
import { getProp, setTagName } from './syntax/element';
import * as t from './types';

export class ElementContext extends Context {
  using = new Set<DefineContext>();
  node: t.JSXElement;

  constructor(
    public parent: Context,
    path: t.JSXElement | t.NodePath<t.JSXElement>){

    super(path instanceof t.NodePath ? path : undefined, parent);

    if(path instanceof t.NodePath){
      this.node = path.node;
    }
    else {
      this.node = path
      return
    }

    const opening = path.get("openingElement");
    let name = opening.get("name");

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

  use(name: string | DefineContext){
    const apply = typeof name == "string"
      ? this.get(name) : [name];

    apply.forEach(context => {
      context.usedBy.add(this);
      this.using.add(context);
    });

    return apply;
  }

  setTagName(to: string){
    setTagName(this.node, to);
  }

  getProp(named: string){
    return getProp(this.node, named);
  }

  addClassName(name: string | t.Expression){
    const { attributes } = this.node.openingElement;
    const existing = getProp(this.node, "className");
  
    if(typeof name == "string")
      name = t.stringLiteral(name);
  
    if(t.isStringLiteral(existing) && t.isStringLiteral(name)){
      existing.value += " " + name.value;
      return;
    }
  
    if(!existing){
      attributes.push(
        t.jsxAttribute(
          t.jsxIdentifier("className"),
          t.isStringLiteral(name)
            ? name : t.jsxExpressionContainer(name)
        )
      );
      return;
    }

    const concat = this.module.getHelper("classNames");
  
    if(t.isCallExpression(existing) && existing.callee === concat)
      if(!t.isStringLiteral(name))
        existing.arguments.push(name);
      else
        for(const value of existing.arguments)
          if(t.isStringLiteral(value)){
            value.value += " " + name.value;
            return;
          }
  
    for(const attr of attributes)
      if(t.isJSXAttribute(attr) && t.isJSXIdentifier(attr.name, { name: "className" })){
        attr.value = t.jsxExpressionContainer(
          t.callExpression(concat, [name, existing])
        )
        return;
      }
  
    throw new Error("Could not insert className");
  }
}