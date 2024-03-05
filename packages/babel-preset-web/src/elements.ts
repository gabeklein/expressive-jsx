import { Context, DefineContext, FunctionContext, getContext } from './context';
import { setClassNames } from './syntax/className';
import { extractClassName, forwardFunctionProps } from './syntax/element';
import * as t from './types';

export function handleElement(
  path: t.NodePath<t.JSXElement>){
  
  const parent = getContext(path);
  const element = new ElementContext(path, parent);

  setProps(path, element);

  if(element.apply)
    element.apply(element);
}

function setProps(
  path: t.NodePath<t.JSXElement>,
  element: ElementContext){
  
  const names: t.Expression[] = [];
  let props;

  element.using.forEach(context => {
    if(context instanceof FunctionContext)
      props = forwardFunctionProps(path);

    let { className } = context;

    if(typeof className == 'string')
      className = t.stringLiteral(className);

    if(className)
      names.push(className);
  })

  if(names.length){
    if(props)
      names.unshift(extractClassName(props, path.scope));

    setClassNames(path, names);
  }
}

export class ElementContext extends Context {
  using = new Set<DefineContext>();

  constructor(
    public path: t.NodePath<t.JSXElement>,
    public parent: Context){

    const opening = path.get("openingElement");
    let name = opening.get("name");

    super(parent);

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

    this.assignTo(path);
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
}