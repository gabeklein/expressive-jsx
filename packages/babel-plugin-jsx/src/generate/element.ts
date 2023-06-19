import { AttributeStack } from 'generate/attributes';
import { Style, Prop } from 'handle/attributes';
import { Define, DefineLocal, DefineVariant, ElementInline } from 'handle/definition';
import * as $ from 'syntax';

import type * as t from 'syntax/types';
import type { FileManager } from 'scope';
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
    return this.context.opts.styleMode === "inline";
  }

  get info(){
    const { props, children } = this;
    const className = classValue(this.classList, this.context.program);
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

  element(collapsable?: boolean){
    return this.context.program.element(this.info, this.tag, collapsable);
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

    else if($.isExpression(item))
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
        else if($.is(value, "StringLiteral"))
          ({ value } = value);
        else if($.isExpression(value)){
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

    if(from.isDeclared && from.isUsed)
      this.classList.add(from.uid);

    return true;
  }
}

function classValue(
  list: Set<t.Expression | string>,
  program: FileManager){

  if(!list.size)
    return;

  const selectors = [] as t.Expression[];
  let className = "";

  for(const item of list)
    if(typeof item == "string")
      className += " " + item;
    else
      selectors.push(item);

  if(className)
    selectors.unshift(
      $.literal(className.slice(1))
    )

  if(selectors.length > 1){
    const _use = program.ensure("$runtime", "classNames");
    return $.call(_use, ...selectors)
  }
  
  return selectors[0];
}