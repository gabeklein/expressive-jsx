import { Context, DefineContext } from './context';
import { getHelper } from './syntax/program';
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
    const { node } = this.path;
    const { attributes } = node.openingElement;
    const existing = getProp(node, "className");
  
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
  
    const program = this.path.find(x => x.isProgram()) as t.NodePath<t.Program>;
    const concat = getHelper(program, "classNames");
  
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