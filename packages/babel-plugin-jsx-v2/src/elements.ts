import { Context, DefineContext, FunctionContext, getContext } from './context';
import { setClassNames } from './syntax/className';
import { extractClassName, forwardProps, setTagName } from './syntax/element';
import { hasProperTagName } from './syntax/tags';
import * as t from './types';

export function handleElement(
  path: t.NodePath<t.JSXElement>){
  
  const parent = getContext(path);
  const opening = path.get("openingElement");
  const tagName = opening.get("name");
  const element = new ElementContext(tagName.toString(), parent);

  function use(name: string){
    const apply = element.get(name);

    apply.forEach(x => {
      x.usedBy.add(element);
      element.using.add(x);
    });

    return apply.length > 0;
  }

  let tag = tagName.node;

  while(t.isJSXMemberExpression(tag)){
    use(tag.property.name);
    tag = tag.object;
  }

  if(t.isJSXIdentifier(tag))
    use(tag.name);

  if(t.isJSXIdentifier(tag))
    use(tag.name);

  opening.get("attributes").forEach((attr) => {
    if(!attr.isJSXAttribute() || attr.node.value)
      return;

    let { name } = attr.node.name;
  
    if(typeof name !== "string")
      name = name.name;
    
    if(use(name))
      attr.remove();
  });

  const names: t.Expression[] = []
  let forward = false;
  
  for(const context of element.using){
    let { className } = context;

    if(context instanceof FunctionContext)
      forward = true;

    if(typeof className == 'string')
      className = t.stringLiteral(className);

    if(className)
      names.push(className);
  }

  if(forward){
    const props = forwardProps(path);

    if(names.length)
      names.unshift(extractClassName(props, path.scope))
  }

  if(names.length > 0)
    setClassNames(path, names);

  if(!hasProperTagName(path))
    setTagName(path, "div");

  element.assignTo(path);
}

export class ElementContext extends Context {
  using = new Set<DefineContext>();
  props: Record<string, t.Expression> = {};
  styles: Record<string, t.Expression | string> = {};

  get(name: string){
    const mods = new Set<DefineContext>();

    for(const ctx of [this.parent!, ...this.using])
      ctx.get(name).forEach(x => mods.add(x));

    return Array.from(mods);
  }
}