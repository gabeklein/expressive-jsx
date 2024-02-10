import { DefineContext, FunctionContext } from './context';
import { setClassNames } from './syntax/className';
import { extractClassName, forwardProps, hasProperTagName, setTagName } from './syntax/element';
import * as t from './types';

export function handleElement(
  context: DefineContext,
  path: t.NodePath<t.JSXElement>){

  new JSXElement(path, context)
}

export class JSXElement {
  forward = false;
  using = new Set<DefineContext>();

  props: Record<string, t.Expression> = {};
  styles: Record<string, t.Expression | string> = {};
  classNames: t.Expression[] = [];

  constructor(
    public path: t.NodePath<t.JSXElement>,
    public context: DefineContext){

    this.parse();
    this.apply();
  }

  use(name: string){
    const apply = this.context.get(name);
    apply.forEach(x => this.using.add(x));
    return apply.length > 0;
  }

  protected parse(){
    let tag = this.path.node.openingElement.name;

    while(t.isJSXMemberExpression(tag)){
      this.use(tag.property.name);
      tag = tag.object;
    }

    if(t.isJSXIdentifier(tag))
      this.use(tag.name);

    const attrs = this.path.get("openingElement").get("attributes");

    for(const attr of attrs)
      if(attr.isJSXAttribute()){
        let {
          name: { name },
          value
        } = attr.node;

        if(name === "className"){
          const className = t.isJSXExpressionContainer(value)
            ? value.expression
            : value;

          if(t.isExpression(className))
            this.classNames.push(className);
        }

        if(value)
          continue;
      
        if(typeof name !== "string")
          name = name.name;
        
        if(this.use(name))
          attr.remove();
      }

    for(const def of this.using){
      if(def instanceof FunctionContext)
        this.forward = true;

      this.classNames.push(def.className);
    }
  }

  protected apply(){
    const { classNames, path } = this;

    if(this.forward){
      const props = forwardProps(path);

      if(classNames.length)
        classNames.unshift(extractClassName(props, path))
    }

    if(!hasProperTagName(path))
      setTagName(path, "div");

    if(this.classNames.length > 0)
      setClassNames(this.path, this.classNames);
  }
}