import { callExpression, isExpression, isStringLiteral, stringLiteral } from '@babel/types';
import { ComponentExpression, ComponentIf, ContingentModifier, ElementModifier, ExplicitStyle, Prop } from 'handle';
import { AttributeStack } from 'translate';

import type { ElementInline } from 'handle';
import type { Expression } from '@babel/types';
import type { BunchOf, PropData, SequenceItem } from 'types';
import type { ExternalsManager } from 'regenerate';

export function generateElement(element: ElementInline){
  const { tagName, context } = element;
  const children = [] as Expression[];
  const props = [] as PropData[];

  const style = new AttributeStack();
  const style_static = [] as ExplicitStyle[];
  const classList = [] as Array<string | Expression>;

  if(context.opts.styleMode !== "inline")
      applyModifiers();

  for(const item of element.sequence)
    apply(item);

  applyHoistedStyle();
  applyClassname();
  
  const value = style.flatten();

  if(value)
    props.push({ name: "style", value });

  return { tagName, props, children };

  function apply(item: SequenceItem){
    if(item instanceof ComponentIf){
      if(item.hasElementOutput)
        children.push(item.toExpression(context))

      if(item.hasStyleOutput)
        classList.push(item.toClassName());
    }

    else if(item instanceof ExplicitStyle)
      applyStyle(item);

    else if(item instanceof Prop)
      applyProp(item);

    else if("toExpression" in item)
      children.push(item.toExpression())

    else if(isExpression(item))
      children.push(item);
  }

  function applyProp(item: Prop){
    const { name } = item;

    if(name === "style"){
      const styleProp = item.expression;
      const spread = new ExplicitStyle(false, styleProp);
      style.push(spread);
      return;
    }

    if(name === "className"){
      let { value } = item;

      if(value && typeof value == "object")
        if(isStringLiteral(value))
          ({ value } = value);
        else if(isExpression(value)){
          classList.push(value);
          return;
        }

      if(typeof value == "string")
        classList.push(value.trim());

      return;
    }

    props.push({ name, value: item.expression });
  }

  function applyStyle(item: ExplicitStyle){
    if(context.opts.styleMode == "inline")
      item.invariant = false;

    if(item.invariant)
      style_static.push(item);
    else
      style.insert(item)
  }

  function applyModifiers(){
    const accumulator = {} as BunchOf<ExplicitStyle>;
    // TODO: respect priority differences!

    for(const mod of element.modifiers){
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
          || name in element.style
          || name in accumulator)
            continue;
  
          accumulator[name] = style;
        }
    }

    for(const name in accumulator){
      const style = accumulator[name];
      element.style[name] = style;
      applyStyle(style);
    }
  }

  function applyHoistedStyle(){
    if(style_static.length > 0){
      const { name, uid } = element;
      const mod = new ContingentModifier(context, element);

      const classMostLikelyForwarded =
        /^[A-Z]/.test(name!) &&
        !(element instanceof ComponentExpression);

      mod.priority = classMostLikelyForwarded ? 3 : 2;
      mod.sequence.push(...style_static);
      mod.forSelector = [ `.${uid}` ];
      mod.include();
    }
  }

  function applyClassname(){
    if(element.hasOwnProperty("uid"))
      classList.push(element.uid);

    const computeClassname =
      classValue(classList, context.Imports);

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