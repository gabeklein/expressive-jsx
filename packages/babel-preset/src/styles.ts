import { Context } from './plugin';
import { camelToDash } from './helper/util';

export function isInUse(context: Context){
  return context.props.size > 0;
}

export function byPriority(a: Context, b: Context){
  return depth(a) - depth(b);
}

export function toCss(context: Context){
  const css = [] as string[];

  for(let [name, value] of context.props)
    css.push("  " + toCssProperty(name, value));

  const select = toSelector(context);
  const style = css.join("\n");
    
  return `${select} {\n${style}\n}`
}

export function toCssProperty(name: string, value: any){
  const property = name
    .replace(/^\$/, "--")
    .replace(/([A-Z]+)/g, "-$1")
    .toLowerCase();

  if(Array.isArray(value))
    value = value.map(value => {
      if(typeof value == "string" && /^\$/.test(value))
        return `var(--${
          camelToDash(value.slice(1))
        })`;

      return value;
    })

  return `${property}: ${value.join(" ")};`;
}

export function toSelector(context: Context): string {
  let { parent, condition, uid } = context;

  if(typeof condition === "string")
    return toSelector(context.parent!) + condition;

  let selector = "";

  while(parent){
    if(parent instanceof Context && parent.condition){
      selector = toSelector(parent) + " ";
      break;
    }
    parent = parent.parent;
  }

  return selector += "." + uid;
}

export function depth(context: Context){
  let depth = 0;

  do {
    if(context.path.isFunction())
      break;
    else
      depth += /^[A-Z]/.test(context.uid) ? 2 : 1;
  }
  while(context = context.parent!)

  return depth;
}