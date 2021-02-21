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
  JSXMemberExpression,
  ObjectProperty,
  SpreadElement
} from '@babel/types';
import type { StackFrame } from 'context';
import type { BunchOf, ContentLike, PropData, SequenceItem } from 'types';

export class ElementReact<E extends ElementInline = ElementInline> {
  source: E;
  context: StackFrame;
  children = [] as ContentLike[];
  props = [] as PropData[];
  classList = [] as Array<string | Expression>
  style = new AttributeStack<ExplicitStyle>();
  style_static = [] as ExplicitStyle[];

  get tagName(): string | JSXMemberExpression {
    const { name, explicitTagName } = this.source;
    return explicitTagName || (
      name && /^[A-Z]/.test(name) ? name : "div"
    );
  }

  constructor(source: E){
    this.source = source;
    this.context = source.context;

    this.willParse();

    for(const item of this.source.sequence)
      this.integrate(item);

    this.applyHoistedStyle();
    this.applyInlineStyle();
    this.applyClassname();
  }

  protected willParse(){
    if(this.context.opts.styleMode !== "inline")
      this.applyModifiers();
  }

  private integrate(item: SequenceItem){
    if(item instanceof ComponentIf){
      if(item.hasElementOutput)
        this.adopt(item)

      if(item.hasStyleOutput)
        this.classList.push(item.toClassName());
    }

    else if(item instanceof ComponentFor)
      this.adopt(new ElementIterate(item))

    else if(item instanceof ElementInline)
      this.adopt(new ElementReact(item));

    else if(item instanceof ExplicitStyle)
      this.applyStyle(item);

    else if(item instanceof Prop)
      this.applyProp(item);

    else if(isExpression(item))
      this.adopt(item);
  }

  protected applyModifiers(){
    const elementStyle = this.source.style;
    const accumulator = {} as BunchOf<ExplicitStyle>;
    // TODO: respect priority differences!

    for(const mod of this.source.modifiers){
      if(!(mod instanceof ElementModifier))
        continue

      if(mod.sequence.length === 0
      && mod.alsoApplies.length === 0)
        continue;

      if(mod.hasTargets > 1
      || mod.onlyWithin){
        this.applyModifierAsClassname(mod);
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

  private applyModifierAsClassname(mod: ElementModifier){
    let doesProvideAStyle = false;
    const declared = this.context.modifiersDeclared;

    for(const applicable of [mod, ...mod.alsoApplies]){
      if(applicable.sequence.length)
        declared.add(applicable);

      if(applicable instanceof ContingentModifier)
        doesProvideAStyle = true;
      else
      if(applicable instanceof ElementModifier)
        if(applicable.sequence.length)
          this.classList.push(applicable.uid);
    }

    if(doesProvideAStyle)
      declared.add(mod);
  }

  private addProperty(
    name: string | false | undefined,
    value: Expression){

    this.props.push({ name, value });
  }

  protected adopt(item: ContentLike){
    this.children.push(item)
  }

  private applyHoistedStyle(){
    const { style_static, context, source } = this;

    if(style_static.length > 0){
      const mod = new ContingentModifier(context, source);
      const { name, uid } = source;

      const classMostLikelyForwarded =
        /^[A-Z]/.test(name!) &&
        !(source instanceof ComponentExpression);

      mod.priority = classMostLikelyForwarded ? 3 : 2;
      mod.sequence.push(...style_static);
      mod.forSelector = [ `.${uid}` ];
      context.modifiersDeclared.add(mod);
    }
  }

  private applyInlineStyle(){
    const { style } = this;

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

    this.addProperty("style", value)
  }

  private applyClassname(){
    const {
      classList: list,
      context: { Imports },
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
      const join = Imports.ensure("$runtime", "join");
      computeClassname = callExpression(join, selectors)
    }

    this.addProperty("className", computeClassname)
  }

  private applyStyle(item: ExplicitStyle){
    if(this.context.opts.styleMode == "inline")
      item.invariant = false;

    if(item.invariant)
      this.style_static.push(item);
    else
      this.style.insert(item)
  }

  private applyProp(item: Prop){
    switch(item.name){
      case "style": {
        const styleProp = item.toExpression();
        const spread = new ExplicitStyle(false, styleProp);
        this.style.push(spread);
        break;
      }

      case "className": {
        let { value } = item;

        if(value && typeof value == "object")
          if(isStringLiteral(value))
            ({ value } = value);
          else if(isExpression(value)){
            this.classList.push(value);
            break;
          }

        if(typeof value == "string")
          this.classList.push(value.trim());

        break;
      }

      default:
        this.addProperty(item.name, item.toExpression());
    }
  }
}