import { Context, DefineContext, getContext } from './context';
import { setClassNames } from './syntax/className';
import { extractClassName, forwardProps, setTagName } from './syntax/element';
import { hasProperTagName } from './syntax/tags';
import * as t from './types';

export function handleElement(
  path: t.NodePath<t.JSXElement>){
  
  const element = new AbstractJSX(path);
  const opening = path.get("openingElement");
  let tag = opening.node.name;

  while(t.isJSXMemberExpression(tag)){
    element.use(tag.property.name);
    tag = tag.object;
  }

  if(t.isJSXIdentifier(tag))
    element.use(tag.name);

  if(!hasProperTagName(path))
    setTagName(path, "div");

  if(t.isJSXIdentifier(tag))
    element.use(tag.name);

  opening.get("attributes").forEach((attr) => {
    if(!attr.isJSXAttribute() || attr.node.value)
      return;

    let { name } = attr.node.name;
  
    if(typeof name !== "string")
      name = name.name;
    
    if(element.use(name))
      attr.remove();
  });

  element.commit();
}

export class AbstractJSX extends Context {
  forwardProps = false;
  parent: Context;
  
  using = new Set<DefineContext>();
  props: Record<string, t.Expression> = {};
  styles: Record<string, t.Expression | string> = {};

  constructor(public path: t.NodePath<t.JSXElement>){
    const tagName = path.get("openingElement.name").toString();
    const parent = getContext(path);

    super(tagName);

    this.parent = parent;
    this.assignTo(path);
  }

  get(name: string){
    const mods = new Set<DefineContext>();

    for(const ctx of [this.parent, ...this.using])
      ctx.get(name).forEach(x => mods.add(x));

    return Array.from(mods);
  }

  use(name: string){
    const apply = this.get(name);

    if(name === "this")
      this.forwardProps = true;

    apply.forEach(x => {
      x.usedBy.add(this);
      this.using.add(x);
    });

    return apply.length > 0;
  }

  commit(){
    const { using, path } = this;
    const names = Array.from(using, ({ className: x }) => (
      typeof x === "string" ? t.stringLiteral(x) : x
    ));

    if(this.forwardProps){
      const props = forwardProps(path);

      if(names.length)
        names.unshift(extractClassName(props, path.scope))
    }

    if(names.length > 0)
      setClassNames(path, names);
  }
}