import {
  callExpression,
  Expression,
  isStringLiteral,
  JSXMemberExpression,
  objectExpression,
  objectProperty,
  ObjectProperty,
  SpreadElement,
  spreadElement,
  stringLiteral,
} from '@babel/types';
import {
  Attribute,
  ComponentExpression,
  ComponentFor,
  ComponentIf,
  ContingentModifier,
  ElementInline,
  ElementModifier,
  ExplicitStyle,
  Prop,
} from 'handle';
import { StackFrame } from 'parse';
import { Shared } from 'shared';
import { AttributeStack, ElementIterate, ElementSwitch } from 'translate';
import { BunchOf, ContentLike, PropData, SequenceItem } from 'types';

export class ElementReact<E extends ElementInline = ElementInline> {

  source: E;
  context: StackFrame;
  children = [] as ContentLike[];
  props = [] as PropData[];
  classList = [] as Array<string | Expression>
  style = new AttributeStack<ExplicitStyle>();
  style_static = [] as ExplicitStyle[];

  constructor(source: E){
    this.source = source;
    this.context = source.context;
    this.parse(true);
  }

  parse(invariant?: boolean, overridden?: boolean){
    let { sequence } = this.source;

    const replace = this.willParse(sequence);
    
    if(replace)
      sequence = replace;

    for(const item of sequence as SequenceItem[]){
      if(item instanceof ComponentIf)
        this.Switch(item)

      else if(item instanceof ComponentFor)
        this.Iterate(item)

      else if(item instanceof ElementInline)
        this.Child(item);

      else if(item instanceof Attribute){
        if(!overridden && item.overridden
        || !invariant && item.invariant)
          continue;

        if(item instanceof ExplicitStyle)
          this.Style(item);
        else
        if(item instanceof Prop)
          this.Props(item);
      }

      else if(isExpression(item))
        this.Content(item);

      else
        this.Statement(item);
    }

    if(this.didParse)
      this.didParse();
  }

  willParse(sequence: SequenceItem[]){
    const { classList } = this.source.data;
    const accumulator = {} as BunchOf<Attribute>
    const existsAlready = this.source.style;
    const inlineOnly = Shared.opts.styleMode === "inline";
    // TODO: respect priority differences!

    const willCollide = (name: string) =>
      name in existsAlready ||
      name in accumulator &&
      accumulator[name].overridden !== true

    if(classList)
      this.classList.push(...classList);

    for(const mod of this.source.modifiers){
      if(mod.sequence.length === 0 && mod.applicable.length === 0)
        continue

      const maybeMod = mod as ElementModifier;

      const collapsable =
        maybeMod.nTargets == 1 &&
        mod.onlyWithin === undefined &&
        mod.applicable.length === 0;

      for(const style of mod.sequence){
        if(!(style instanceof ExplicitStyle))
          continue;

        if(!style.invariant || inlineOnly || collapsable){
          const { name } = style;

          if(!name || willCollide(name))
            continue;

          accumulator[name] = style;
        }
      }

      if(!inlineOnly && !collapsable)
        this.applyModifierAsClassname(maybeMod)
    }

    for(const name in accumulator)
      existsAlready[name] = accumulator[name] as ExplicitStyle;

    const pre: SequenceItem[] = Object.values(accumulator);

    if(pre.length)
      return pre.concat(sequence);
  }

  applyModifierAsClassname(mod: ElementModifier){
    let doesProvideAStyle = false;
    const declared = this.context.Module.modifiersDeclared;

    for(const applicable of [mod, ...mod.applicable]){
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

  didParse(){
    this.applyHoistedStyle();
    this.applyInlineStyle();
    this.applyClassname();
  }

  addProperty(
    name: string | false | undefined,
    value: Expression){

    this.props.push({ name, value });
  }

  get tagName(): string | JSXMemberExpression {
    const { name, explicitTagName } = this.source;
    return explicitTagName || (
      name && /^[A-Z]/.test(name) ? name : "div"
    );
  }

  protected adopt(item: ContentLike){
    this.children.push(item)
  }

  private applyHoistedStyle(){
    const { style_static, context } = this;

    if(style_static.length > 0){
      const mod = new ContingentModifier(context, this.source);
      const { name, uid } = this.source;

      const classMostLikelyForwarded =
        /^[A-Z]/.test(name!) &&
        !(this.source instanceof ComponentExpression);

      mod.priority = classMostLikelyForwarded ? 3 : 2;
      mod.sequence.push(...style_static);
      mod.forSelector = [ `.${uid}` ];
      context.Module.modifiersDeclared.add(mod);
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
          chunks.push(...item.map(style => {
            return objectProperty(
              stringLiteral(style.name!),
              style.toExpression()
            )
          }));

      value = objectExpression(chunks)
    }

    this.addProperty("style", value)
  }

  private applyClassname(){
    if(this.source.hasOwnProperty("uid"))
      this.classList.push(this.source.uid);

    if(!this.classList.length)
      return;

    const selectors = [] as Expression[];
    let classList = "";

    for(const item of this.classList)
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
      const join = this.context.Imports.ensure("$runtime", "join");
      computeClassname = callExpression(join, selectors)
    }

    this.addProperty("className", computeClassname)
  }

  Style(item: ExplicitStyle){
    if(Shared.opts.styleMode == "inline")
      (<any>item).invariant = false;

    if(item.invariant)
      this.style_static.push(item);
    else
      this.style.insert(item)
  }

  Props(item: Prop){
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
            value = value.value;
          else {
            this.classList.push(value as Expression);
            break;
          }

        if(typeof value == "string")
          this.classList.push(value.trim());
      } break;

      default:
        this.addProperty(item.name, item.toExpression());
    }
  }

  Child(item: ElementInline){
    this.adopt(new ElementReact(item));
  }

  Content(item: Expression){
    this.adopt(item);
  }

  Switch(item: ComponentIf){
    const fork = new ElementSwitch(item)

    if(item.hasElementOutput)
      this.adopt(fork)

    if(item.hasStyleOutput){
      this.classList.push(
        fork.toClassName()
      );
    }
  }

  Iterate(item: ComponentFor){
    this.adopt(new ElementIterate(item))
  }

  Statement(item: any){
    void item;
  }
}