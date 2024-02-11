import { Context, DefineContext, FocusContext, FunctionContext, getContext } from './context';
import { setClassNames } from './syntax/className';
import { extractClassName, forwardProps, hasProperTagName, setTagName } from './syntax/element';
import * as t from './types';

export class AbstractJSX {
  forwardProps = false;
  using = new Set<DefineContext>();

  props: Record<string, t.Expression> = {};
  styles: Record<string, t.Expression | string> = {};
  classNames: t.Expression[] = [];
  context: Context;

  constructor(
    public path: t.NodePath<t.JSXElement>){

    this.context = getContext(path);
    this.parse();
    this.apply();
  }

  use(name: string){
    const apply = this.context.get(name);
    apply.forEach(x => this.using.add(x));
    return apply.length > 0;
  }

  protected parse(){
    const opening = this.path.get("openingElement");
    let tag = opening.node.name;

    while(t.isJSXMemberExpression(tag)){
      this.use(tag.property.name);
      tag = tag.object;
    }

    if(t.isJSXIdentifier(tag))
      this.use(tag.name);

    for(const attr of opening.get("attributes")){
      if(!attr.isJSXAttribute())
        continue;

      let { name: { name }, value } = attr.node;

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

    const focus = new FocusContext(this.using);

    focus.assignTo(this.path);

    for(const def of this.using){
      if(def instanceof FunctionContext)
        this.forwardProps = true;

      this.classNames.push(def.className);
    }
  }

  protected apply(){
    const { classNames, path } = this;

    if(this.forwardProps){
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