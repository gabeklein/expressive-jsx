import { callExpression, isExpression, isStringLiteral, stringLiteral } from '@babel/types';
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

import type { Expression } from '@babel/types';
import type { BunchOf, ContentLike, PropData, SequenceItem } from 'types';
import type { ExternalsManager } from 'regenerate';

export class ElementReact<E extends ElementInline = ElementInline> {
  classList = [] as Array<string | Expression>;
  children = [] as ContentLike[];
  props = [] as PropData[];

  private style = new AttributeStack();
  private style_static = [] as ExplicitStyle[];

  get tagName(){
    return this.source.tagName;
  }

  constructor(
    public source: E){

    if(this.source.context.opts.styleMode !== "inline")
      this.applyModifiers();

    for(const item of this.source.sequence)
      this.apply(item);

    this.applyStyles();
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
        const styleProp = item.expression;
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
          value: item.expression
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

  private applyStyles(){
    this.applyHoistedStyle();
    this.applyInlineStyle();
    this.applyClassname();
  }

  private applyHoistedStyle(){
    const { style_static, source } = this;

    if(style_static.length > 0){
      const { context, name, uid } = source;
      const mod = new ContingentModifier(context, source);

      const classMostLikelyForwarded =
        /^[A-Z]/.test(name!) &&
        !(source instanceof ComponentExpression);

      mod.priority = classMostLikelyForwarded ? 3 : 2;
      mod.sequence.push(...style_static);
      mod.forSelector = [ `.${uid}` ];
      mod.include();
    }
  }

  private applyInlineStyle(){
    const value = this.style.flatten();

    if(value)
      this.props.push({ name: "style", value });
  }

  private applyClassname(){
    const { classList, props, source } = this;

    if(source.hasOwnProperty("uid"))
      classList.push(source.uid);

    const computeClassname =
      classValue(classList, source.context.Imports);

    if(computeClassname)
      props.push({
        name: "className",
        value: computeClassname
      });
  }
}

function classValue(
  list: (Expression | string)[],
  Imports: ExternalsManager){

  if(!list.length)
    return;

  const selectors = [] as Expression[];
  let className = "";

  for(const item of list)
    if(typeof item == "string")
      className += " " + item;
    else
      selectors.push(item);

  if(className)
    selectors.unshift(
      stringLiteral(className.slice(1))
    )

  if(selectors.length > 1){
    const join = Imports.ensure("$runtime", "join");
    return callExpression(join, selectors)
  }
  
  return selectors[0];
}