import { Context, DefineContext } from './context';
import { t } from './types';

import type { NodePath } from '@babel/traverse';
import type { Expression, JSXElement } from '@babel/types';

export class ElementContext extends Context {
  using = new Set<DefineContext>();
  node: JSXElement;

  constructor(
    public parent: Context,
    path: JSXElement | NodePath<JSXElement>){

    const isPath = "node" in path;

    super(isPath ? path : undefined, parent);

    if(isPath){
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

  setTagName(name: string){
    const { openingElement, closingElement } = this.node;
    const tag = t.jsxIdentifier(name);
  
    openingElement.name = tag;
  
    if(closingElement)
      closingElement.name = tag;
  }

  getProp(name: string){
    const { attributes } = this.node.openingElement;

    for(const attr of attributes)
      if(t.isJSXAttribute(attr) && attr.name.name === name){
        const { value } = attr;

        if(t.isJSXExpressionContainer(value) && t.isExpression(value.expression))
          return value.expression;

        if(t.isExpression(value))
          return value;
      }
  }

  addClassName(name: string | Expression){
    const { attributes } = this.node.openingElement;
    const existing = this.getProp("className");
  
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
  
    if(t.isCallExpression(existing) && t.isIdentifier(existing.callee, { name: concat.name }))
      if(t.isStringLiteral(name)){
        for(const value of existing.arguments)
          if(t.isStringLiteral(value)){
            value.value += " " + name.value;
            return;
          }
      }
      else {
        existing.arguments.push(name);
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