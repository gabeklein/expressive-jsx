import { AttributeStack } from 'generate/attributes';
import { ExplicitStyle, Prop } from 'handle/attributes';
import { Define, DefineLocal, DefineVariant } from 'handle/definition';
import { ElementInline } from 'handle/element';
import * as s from 'syntax';

import type * as t from 'syntax/types';
import type { DefineElement } from 'handle/definition';
import type { FileManager } from 'scope';
import type { DefineConsequent } from 'handle/switch';
import type { PropData, SequenceItem } from 'types';

const byPriority = (x: any, y: any) => x.priority - y.priority;

export function generateElement(element: ElementInline | Define){
  const { context, sequence, includes } = element;

  const inline_only = context.opts.styleMode === "inline";
  const no_collapse = context.opts.styleMode === "verbose";

  const props = [] as PropData[];
  const children = [] as t.Expression[];

  const style = new AttributeStack();
  const classList = new Set<string | t.Expression>();

  Array.from(includes)
    .sort(byPriority)
    .forEach(applyModifier);

  sequence.forEach(apply);

  if(element instanceof ElementInline && style.invariant.size)
    element = new DefineLocal(element, style.invariant);

  if(element instanceof Define)
    useClass(element);

  const className = classValue(classList, context.program);
  const stylesProp = style.flatten();

  if(className)
    props.push({ name: "className", value: className });

  if(stylesProp)
    props.push({ name: "style", value: stylesProp });

  return { props, children };

  function apply(item: SequenceItem){
    if(item instanceof ExplicitStyle)
      style.insert(item, inline_only);

    else if(item instanceof Prop)
      applyProp(item);

    else if("toExpression" in item){
      const child = item.toExpression();

      if(child && (child.type !== "BooleanLiteral" || child.value !== false))
        children.push(child);

      if("toClassName" in item){
        const className = item.toClassName();

        if(className)
          classList.add(className);
      }
    }

    else if(s.isExpression(item))
      children.push(item);
  }

  function applyProp(item: Prop){
    const { name } = item;

    if(name === "style"){
      style.push(
        new ExplicitStyle(false, item.expression)
      );
      return;
    }

    if(name === "className"){
      let { value } = item;

      if(value && typeof value == "object")
        if(value.type == "StringLiteral")
          ({ value } = value);
        else if(s.isExpression(value)){
          classList.add(value);
          return;
        }

      if(typeof value == "string")
        classList.add(value.trim());

      return;
    }

    props.push({ name, value: item.expression });
  }

  function useClass(from: DefineElement | DefineConsequent){
    if(inline_only || from.collapsable && !no_collapse)
      return false;

    from.setActive();

    if(from.isDeclared && from.isUsed)
      classList.add(from.uid);

    return true;
  }

  function applyModifier(mod: Define){
    if(inline_only && mod instanceof DefineVariant){
      console.warn(`Cannot include CSS for ${mod.selector} with inline_only mode. Skipping.`);
      return;
    }

    const using_css = useClass(mod);

    for(const prop of mod.sequence)
      if(prop instanceof ExplicitStyle){
        const { name, invariant } = prop;

        if(!name || invariant && using_css)
          continue;

        style.insert(prop);
      }
      else
        apply(prop);
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
      s.literal(className.slice(1))
    )

  if(selectors.length > 1){
    const _use = program.ensure("$runtime", "use");
    return s.call(_use, ...selectors)
  }
  
  return selectors[0];
}