import { callExpression, isExpression, isStringLiteral, stringLiteral } from '@babel/types';
import { AttributeStack } from 'generate';
import { ComponentIf, DefineElement, DefineVariant, ExplicitStyle, Prop } from 'handle';

import type { ElementInline, DefineConsequent } from 'handle';
import type { Expression } from '@babel/types';
import type { PropData, SequenceItem } from 'types';
import type { FileManager } from 'generate';

const byPriority = (x: any, y: any) => x.priority - y.priority;

export function generateElement(element: ElementInline){
  const { context } = element;

  const inline_only = context.opts.styleMode === "inline";
  const no_collapse = context.opts.styleMode === "verbose";

  const props = [] as PropData[];
  const children = [] as Expression[];

  const style = new AttributeStack();
  const style_static = new Set<ExplicitStyle>();
  const classList = new Set<string | Expression>();

  applyModifiers();

  for(const item of element.sequence)
    apply(item);

  if(style_static.size){
    const mod = new DefineElement(context, element.name!);
    mod.sequence.push(...style_static);
    mod.priority = 2;

    applyModifier(mod);
  }

  const className = classValue(classList, context.Scope);
  const stylesProp = style.flatten();

  if(className)
    props.push({ name: "className", value: className });

  if(stylesProp)
    props.push({ name: "style", value: stylesProp });

  return { props, children };

  function apply(item: SequenceItem){
    if(item instanceof ComponentIf){
      const expression = item.toExpression();
      const className = item.toClassName();

      if(expression)
        children.push(expression)

      if(className)
        classList.add(className);
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
          classList.add(value);
          return;
        }

      if(typeof value == "string")
        classList.add(value.trim());

      return;
    }

    props.push({ name, value: item.expression });
  }

  function applyStyle(item: ExplicitStyle){
    if(inline_only)
      item.invariant = false;

    if(item.invariant && !inline_only)
      style_static.add(item);
    else
      style.insert(item)
  }

  function applyModifier(mod: DefineElement | DefineConsequent){
    classList.add(mod.uid)
    mod.setActive();
  }

  function applyModifiers(){
    const accumulator = new Map<string, ExplicitStyle>();
    const definitions = [ ...element.includes ].sort(byPriority);

    for(const mod of definitions){
      const allow_css = !inline_only && !mod.collapsable || no_collapse;

      if(inline_only && mod instanceof DefineVariant)
        console.warn(`Cannot include CSS for ${mod.selector} with inline_only mode. Skipping.`);

      if(allow_css && mod.containsStyle(true))
        applyModifier(mod);

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
}

function classValue(
  list: Set<Expression | string>,
  Scope: FileManager){

  if(!list.size)
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
    const join = Scope.ensure("$runtime", "join");
    return callExpression(join, selectors)
  }
  
  return selectors[0];
}