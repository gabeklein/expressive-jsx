import { callExpression, isExpression, isStringLiteral, stringLiteral } from '@babel/types';
import { AttributeStack } from 'generate';
import { ComponentIf, DefineElement, ExplicitStyle, Prop } from 'handle';

import type { ElementInline } from 'handle';
import type { Expression } from '@babel/types';
import type { PropData, SequenceItem } from 'types';
import type { ExternalsManager } from 'generate';

const byPriority = (x: any, y: any) => x.priority - y.priority;

export function generateElement(element: ElementInline){
  const { context } = element;

  const children = [] as Expression[];
  const props = [] as PropData[];

  const style = new AttributeStack();
  const style_static = [] as ExplicitStyle[];
  const classList = [] as Array<string | Expression>;

  applyModifiers();

  for(const item of element.sequence)
    apply(item);

  applyHoistedStyle();
  applyClassname();
  
  const value = style.flatten();

  if(value)
    props.push({ name: "style", value });

  return { props, children };

  function apply(item: SequenceItem){
    if(item instanceof ComponentIf){
      const expression = item.toExpression();
      const className = item.toClassName();

      if(expression)
        children.push(expression)

      if(className)
        classList.push(className);
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
    const inline_only = context.opts.styleMode === "inline";
    const accumulator = new Map<string, ExplicitStyle>();
    const definitions = [ ...element.includes ].sort(byPriority);

    for(const mod of definitions){
      if(!(mod instanceof DefineElement))
        continue;

      const allow_css = mod.collapsable && !inline_only;

      if(allow_css && mod.containsStyles(true))
        useModifier(mod);

      for(const property of mod.sequence)
        if(property instanceof ExplicitStyle){
          const { name, invariant } = property;

          if(!name)
            continue;
          
          if(invariant && allow_css)
            continue;
  
          if(accumulator.has(name))
            continue;
  
          accumulator.set(name, property);
        }
        else if(property instanceof Prop)
          apply(property);

      if(mod.children.length > 0)
        if(children.length > 0)
          throw new Error("Cannot integrate children from modifier with an element's existing.")
        else
          for(const item of mod.children)
            apply(item);
    }

    accumulator.forEach(applyStyle);
  }

  function useModifier(mod: DefineElement){
    classList.push(mod.uid)
    mod.setActive();
  }

  function applyHoistedStyle(){
    if(style_static.length === 0)
      return;

    const mod = new DefineElement(context, element.name!);
    mod.priority = 2;
    mod.sequence.push(...style_static);

    useModifier(mod);
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