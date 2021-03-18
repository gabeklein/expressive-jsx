import type { ElementInline } from 'handle/element';

const COMMON_HTML = [
  "article", "blockquote", "input",
  "h1", "h2", "h3", "h4", "h5", "h6",
  "p", "a", "ul", "ol", "li",
  "i", "b", "em", "strong", "span",
  "hr", "img", "div", "br"
];

export function applyPrimaryName(
  target: ElementInline,
  name: string,
  defaultTag: string,
  force?: boolean
){
  if(name == "s")
    name = "span";

  const isCommonTag = COMMON_HTML.indexOf(name) >= 0;

  if(isCommonTag || force || /^[A-Z]/.test(name))
    applyNameImplications(target, name, true, "html");
  else {
    applyNameImplications(target, defaultTag, true, "html");
    applyNameImplications(target, name);
  }
}

export function applyNameImplications(
  target: ElementInline,
  name: string,
  isHead?: true,
  prefix?: string){

  let modify = target.context.elementMod(name);

  if(isHead){
    let explicit;

    if(prefix == "html" || /^[A-Z]/.test(name))
      explicit = target.explicitTagName = name;

    if(!explicit || !target.name)
      target.name = name;
  }
  else
    target.name = name;

  while(modify){
    target.modifiers.push(modify);
    modify.targets.add(target);

    for(const sub of modify.includes)
      target.context.elementMod(sub);

    modify = modify.next;
  }
}