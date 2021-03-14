import type { ElementInline } from 'handle/element';
import type { DefineElement } from 'handle/modifier';

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

  const { context } = target;
  let modify: DefineElement | undefined =
    context.elementMod(name);

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
    modify.targets.add(target)

    // for(const mod of parent.modifiers)
    // if(mod instanceof ElementModifier)
    for(const sub of modify.includes)
      target.context.elementMod(sub)

    if(infiniteLoopDetected(modify))
      break;
      
    modify = modify.next;
  }
}

function infiniteLoopDetected(
  modify: DefineElement){

  if(modify !== modify.next)
    return false;
  
  try {
    if(~process.execArgv.join().indexOf("inspect-brk"))
      console.error(`Still haven't fixed inheritance leak apparently. \n target: ${name}`)
  }
  catch(err){}

  return true;
}