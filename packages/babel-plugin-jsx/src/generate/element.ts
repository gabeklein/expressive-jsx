import { AttributeStack } from 'generate/attributes';
import { Prop, Style } from 'handle/attributes';
import { Define, DefineLocal, DefineVariant, ElementInline } from 'handle/definition';
import * as t from 'syntax';

import type { PropData, SequenceItem } from 'types';
import type { Context } from 'context';

const byPriority = (x: any, y: any) => x.priority - y.priority;

export class Generator {
  tag: string | t.JSXMemberExpression | undefined;
  props = [] as PropData[];
  children = [] as t.Expression[];

  style = new AttributeStack();
  classList = new Set<string | t.Expression>();

  context: Context;

  get inline_only(){
    return this.context.options.styleMode === "inline";
  }

  get info(){
    const { props, children } = this;
    const className = this.className();
    const stylesProp = this.style.flatten();
  
    if(className)
      props.push({ name: "className", value: className });
  
    if(stylesProp)
      props.push({ name: "style", value: stylesProp });
  
    return { props, children };
  }

  constructor(element: ElementInline | Define){
    const { invariant } = this.style;

    this.context = element.context;
    this.tag = element.tagName;

    Array.from(element.includes)
      .sort(byPriority)
      .forEach(mod => {
        if(this.inline_only && mod instanceof DefineVariant){
          console.warn(`Cannot include CSS for ${mod.selector} with inline_only mode. Skipping.`);
          return;
        }

        const using_css = this.useClass(mod);

        for(const prop of mod.sequence)
          if(prop instanceof Style){
            const { name, invariant } = prop;

            if(!name || invariant && using_css)
              continue;

            this.style.insert(prop);
          }
          else
            this.add(prop);
      });
  
    element.sequence.forEach(this.add, this);
  
    if(element instanceof ElementInline && invariant.size)
      element = new DefineLocal(element, invariant);
  
    if(element instanceof Define)
      this.useClass(element);
  }

  className(){
    const { classList, context } = this;
    const { file } = context;
  
    if(!classList.size)
      return;
  
    const selectors = [] as t.Expression[];
    let className = "";
  
    for(const item of classList)
      if(typeof item == "string")
        className += " " + item;
      else
        selectors.push(item);
  
    if(className)
      selectors.unshift(
        t.literal(className.slice(1))
      )
  
    if(selectors.length > 1){
      const _use = file.ensure("$runtime", "classNames");
      return t.call(_use, ...selectors)
    }
    
    return selectors[0];
  }

  element(collapsable?: boolean){
    return this.context.file.element(this.info, this.tag, collapsable);
  }

  add(item: SequenceItem){
    if(item instanceof Style)
      this.style.insert(item, this.inline_only);

    else if(item instanceof Prop)
      this.applyProp(item);

    else if("toExpression" in item){
      const child = item.toExpression();

      if(child && (child.type !== "BooleanLiteral" || child.value !== false))
        this.children.push(child);

      if("toClassName" in item){
        const className = item.toClassName();

        if(className)
          this.classList.add(className);
      }
    }

    else if(t.isExpression(item))
      this.children.push(item);
  }

  applyProp(item: Prop){
    const { name } = item;

    if(name === "style"){
      const style = new Style(false, item.expression);
      this.style.push(style);
      return;
    }

    if(name === "className"){
      let { value } = item;

      if(value && typeof value == "object")
        if("toExpression" in value)
          return; 
        else if(t.isStringLiteral(value))
          ({ value } = value);
        else if(t.isExpression(value)){
          this.classList.add(value);
          return;
        }

      if(typeof value == "string")
        this.classList.add(value.trim());

      return;
    }

    this.props.push({ name, value: item.expression });
  }

  useClass(from: Define){
    if(this.inline_only)
      return false;

    from.setActive();

    if(from.isDeclared && from.isUsed){
      const { context } = this;
      const { extractCss, cssModule } = context.options;
      let className: string | t.Expression = from.uid;

      if(extractCss && cssModule !== false)
        className = t.member(
          context.ensureUIDIdentifier("css"),
          t.identifier(className)
        )
      
      this.classList.add(className);
    }

    return true;
  }
}