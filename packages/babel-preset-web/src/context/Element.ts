import { NodePath } from '@babel/traverse';
import { Expression, JSXElement } from '@babel/types';

import t from '../types';
import { Context } from './Context';
import { Define } from './Define';

export class Element extends Context {
  using = new Set<Define>();

  constructor(
    public parent: Context,
    public path: NodePath<JSXElement>){

    super(parent, path);
  }

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

  setTagName(name: string){
    const { openingElement, closingElement } = this.path.node;
    const tag = t.jsxIdentifier(name);
  
    openingElement.name = tag;
  
    if(closingElement)
      closingElement.name = tag;
  }

  getProp(name: string){
    for(const attr of this.path.node.openingElement.attributes)
      if(t.isJSXAttribute(attr) && attr.name.name === name){
        const { value } = attr;

        if(t.isJSXExpressionContainer(value) && t.isExpression(value.expression))
          return value.expression;

        if(t.isExpression(value))
          return value;
      }
  }

  addClassName(name: string | Expression){
    const { attributes } = this.path.node.openingElement;
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

    const concat = this.getHelper("classNames");
  
    if(t.isCallExpression(existing)
    && t.isIdentifier(existing.callee, { name: concat.name }))
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
      if(t.isJSXAttribute(attr)
      && t.isJSXIdentifier(attr.name, { name: "className" })){
        attr.value = t.jsxExpressionContainer(
          t.callExpression(concat, [name, existing])
        )
        return;
      }
  
    throw new Error("Could not insert className");
  }
}