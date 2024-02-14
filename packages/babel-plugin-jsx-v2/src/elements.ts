import { DefineContext, FocusContext, FunctionContext, getContext } from './context';
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

  element.using.forEach((def) => {
    if(def instanceof FunctionContext)
      element.forwardProps = true;

    element.classNames.push(def.className);
  });

  element.apply();
}

export class AbstractJSX {
  forwardProps = false;
  using = new Set<DefineContext>();

  props: Record<string, t.Expression> = {};
  styles: Record<string, t.Expression | string> = {};
  classNames: t.Expression[] = [];
  context = new FocusContext();

  constructor(
    public path: t.NodePath<t.JSXElement>){

    const { context } = this;
    const parent = getContext(path);

    if(parent instanceof DefineContext)
      context.using.add(parent);
    else if(parent instanceof FocusContext)
      for(const define of parent.using)
        context.using.add(define);

    context.assignTo(path);
  }

  use(name: string){
    const apply = this.context.get(name);

    apply.forEach(x => {
      this.using.add(x);
      this.context.using.add(x);
    });

    return apply.length > 0;
  }

  apply(){
    const { classNames, path } = this;

    if(this.forwardProps){
      const props = forwardProps(path);

      if(classNames.length)
        classNames.unshift(extractClassName(props, path.scope))
    }

    if(classNames.length > 0)
      setClassNames(path, classNames);
  }
}