import { callExpression, isExpression, isStringLiteral, stringLiteral } from '@babel/types';
import { AttributeStack } from 'generate';
import { ComponentIf, DefineContingent, DefineElement, ExplicitStyle, Prop } from 'handle';

import type { ElementInline } from 'handle';
import type { Expression } from '@babel/types';
import type { PropData, SequenceItem } from 'types';
import type { ExternalsManager } from 'generate';

export function generateElement(element: ElementInline){
  const { name, explicitTagName, context } = element;
  const inline_only = context.opts.styleMode === "inline";

  const tagName = explicitTagName || (
    name && /^[A-Z]/.test(name) ? name : "div"
  )

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

  return { tagName, props, children };

  function apply(item: SequenceItem){
    if(item instanceof ComponentIf){
      const expression = item.toExpression(context);
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
    const existing = new Set<string>();
    const accumulator = new Map<string, ExplicitStyle>();
    const definitions = element.modifiers.sort(
      (x, y) => x.priority - y.priority
    );
    
    for(const mod of element.sequence)
      if(mod instanceof ExplicitStyle && mod.name)
        existing.add(mod.name)

    for(const mod of definitions){
      if(!(mod instanceof DefineElement))
        continue;

      if(mod.sequence.length === 0 && mod.includes.size === 0)
        continue;

      if(!inline_only && mod.targets.size > 1 || mod.onlyWithin){
        classList.push(...mod.classList)
        continue;
      }

      for(const style of mod.sequence)
        if(style instanceof ExplicitStyle){
          const { name, invariant } = style;
  
          if(!inline_only && !invariant
          || !name
          || existing.has(name)
          || accumulator.has(name))
            continue;
  
          accumulator.set(name, style);
        }
    }

    accumulator.forEach(applyStyle);
  }

  function applyHoistedStyle(){
    if(style_static.length === 0)
      return;

    const mod = new DefineContingent(context, element);

    mod.priority = 2;
    mod.sequence.push(...style_static);
    mod.forSelector = [ `.${element.uid}` ];
    mod.setActive();
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