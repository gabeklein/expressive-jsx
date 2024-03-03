import { Context, DefineContext, FunctionContext, getContext } from './context';
import { setClassNames } from './syntax/className';
import { extractClassName, forwardFunctionProps, setTagName } from './syntax/element';
import { hasProperTagName } from './syntax/tags';
import * as t from './types';

export function handleElement(
  path: t.NodePath<t.JSXElement>){
  
  const parent = getContext(path);
  const opening = path.get("openingElement");
  const tagName = opening.get("name");
  const element = new ElementContext(tagName.toString(), parent);

  function use(name: string){
    const applied = element.get(name);

    applied.forEach(context => {
      context.usedBy.add(element);
      element.using.add(context);
    });

    return applied.length;
  }

  let tag = tagName.node;

  while(t.isJSXMemberExpression(tag)){
    use(tag.property.name);
    tag = tag.object;
  }

  if(t.isJSXIdentifier(tag))
    use(tag.name);

  opening.get("attributes").forEach(attr => {
    if(!attr.isJSXAttribute() || attr.node.value)
      return;

    let { name } = attr.node.name;
  
    if(typeof name !== "string")
      name = name.name;

    const applied = use(name);
    
    if(applied > 0)
      attr.remove();
  });

  element.assignTo(path);
  setProps(path, element);

  if(!hasProperTagName(path))
    setTagName(path, "div");
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

  get(name: string){
    const mods = new Set<DefineContext>();

    for(const ctx of [this.parent!, ...this.using])
      ctx.get(name).forEach(x => mods.add(x));

    return Array.from(mods);
  }
}