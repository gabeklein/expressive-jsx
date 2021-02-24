import {
  callExpression,
  isExpression,
  isStringLiteral,
  objectExpression,
  objectProperty,
  spreadElement,
  stringLiteral,
} from '@babel/types';
import {
  ComponentExpression,
  ComponentFor,
  ComponentIf,
  ContingentModifier,
  ElementInline,
  ElementModifier,
  ExplicitStyle,
  Prop,
} from 'handle';
import { AttributeStack, ElementIterate } from 'translate';

import type {
  Expression,
  ObjectProperty,
  SpreadElement
} from '@babel/types';
import type { BunchOf, ContentLike, PropData, SequenceItem } from 'types';

export class ElementReact<E extends ElementInline = ElementInline> {
  children = [] as ContentLike[];
  props = [] as PropData[];
  classList = [] as Array<string | Expression>
  style = new AttributeStack<ExplicitStyle>();
  style_static = [] as ExplicitStyle[];

  get tagName(){
    return this.source.tagName;
  }

  constructor(
    public source: E){

    if(this.source.context.opts.styleMode !== "inline")
      this.applyModifiers();

    for(const item of this.source.sequence)
      this.apply(item);

    this.applyHoistedStyle();
    this.applyInlineStyle();
    this.applyClassname();
  }

  private apply(item: SequenceItem){
    if(item instanceof ComponentIf){
      if(item.hasElementOutput)
        this.children.push(item)

      if(item.hasStyleOutput)
        this.classList.push(item.toClassName());
    }

    else if(item instanceof ComponentFor)
      this.children.push(new ElementIterate(item))

    else if(item instanceof ElementInline)
      this.children.push(new ElementReact(item));

    else if(item instanceof ExplicitStyle)
      this.applyStyle(item);

    else if(item instanceof Prop)
      this.applyProp(item);

    else if(isExpression(item))
      this.children.push(item);
  }

  public applyProp(item: Prop){
    const { style, props, classList } = this;

    switch(item.name){
      case "style": {
        const styleProp = item.toExpression();
        const spread = new ExplicitStyle(false, styleProp);
        style.push(spread);
        break;
      }

      case "className": {
        let { value } = item;

        if(value && typeof value == "object")
          if(isStringLiteral(value))
            ({ value } = value);
          else if(isExpression(value)){
            classList.push(value);
            break;
          }

        if(typeof value == "string")
          classList.push(value.trim());

        break;
      }

      default:
        props.push({
          name: item.name,
          value: item.toExpression()
        });
    }
  }

  private applyStyle(item: ExplicitStyle){
    const { source, style, style_static } = this;

    if(source.context.opts.styleMode == "inline")
      item.invariant = false;

    if(item.invariant)
      style_static.push(item);
    else
      style.insert(item)
  }

  protected applyModifiers(){
    const { source, classList } = this;

    const elementStyle = source.style;
    const accumulator = {} as BunchOf<ExplicitStyle>;
    // TODO: respect priority differences!

    for(const mod of source.modifiers){
      if(!(mod instanceof ElementModifier))
        continue

      if(mod.sequence.length === 0 && mod.alsoApplies.length === 0)
        continue;

      if(mod.hasTargets > 1 || mod.onlyWithin){
        classList.push(...mod.classList)
        continue;
      }

      for(const style of mod.sequence)
        if(style instanceof ExplicitStyle){
          const { name, invariant, overridden } = style;
  
          if(!invariant
          || overridden
          || name === undefined
          || name in elementStyle
          || name in accumulator)
            continue;
  
          accumulator[name] = style;
        }
    }

    for(const name in accumulator){
      const style = accumulator[name];
      elementStyle[name] = style;
      this.applyStyle(style);
    }
  }

  private applyHoistedStyle(){
    const { style_static, source } = this;

    if(style_static.length > 0){
      const mod = new ContingentModifier(source.context, source);
      const { name, uid } = source;

      const classMostLikelyForwarded =
        /^[A-Z]/.test(name!) &&
        !(source instanceof ComponentExpression);

      mod.priority = classMostLikelyForwarded ? 3 : 2;
      mod.sequence.push(...style_static);
      mod.forSelector = [ `.${uid}` ];
      source.context.modifiersDeclared.add(mod);
    }
  }

  private applyInlineStyle(){
    const { style, props } = this;

    if(!style.length)
      return;

    let value: Expression;
    const [ head ] = style;

    if(style.length == 1 && head instanceof ExplicitStyle)
      value = head.toExpression();

    else {
      const chunks = [] as (ObjectProperty | SpreadElement)[];

      for(const item of style)
        if(item instanceof ExplicitStyle)
          chunks.push(spreadElement(item.toExpression()))
        else
          chunks.push(...item.map(style =>
            objectProperty(
              stringLiteral(style.name!),
              style.toExpression()
            )
          ));

      value = objectExpression(chunks)
    }

    props.push({
      name: "style",
      value
    });
  }

  private applyClassname(){
    const {
      classList: list,
      props,
      source
    } = this;

    if(source.hasOwnProperty("uid"))
      list.push(source.uid);

    if(!list.length)
      return;

    const selectors = [] as Expression[];
    let classList = "";

    for(const item of list)
      if(typeof item == "string")
        classList += " " + item;
      else
        selectors.push(item);

    if(classList)
      selectors.unshift(
        stringLiteral(classList.slice(1))
      )

    let computeClassname = selectors[0];

    if(selectors.length > 1){
      const join = source.context.Imports.ensure("$runtime", "join");
      computeClassname = callExpression(join, selectors)
    }

    props.push({
      name: "className",
      value: computeClassname
    });
  }
}