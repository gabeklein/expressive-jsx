import { ExplicitStyle, Modifier } from 'handle';
import { BunchOf } from 'types';

type SelectorContent = [ string, string[] ][];
type MediaGroups = SelectorContent[];

export function generateStyleBlock(
  from: Set<Modifier>,
  pretty: boolean){

  if(!from.size)
    return;
  
  const media = organizeStyle(from);
  return createSyntax(media, pretty);
}

function organizeStyle(
  modifiersDeclared: Set<Modifier>){

  const media: BunchOf<MediaGroups> = {
    default: []
  };

  for(let block of modifiersDeclared){
    const { priority = 0 } = block;

    let query = undefined;

    let targetQuery: MediaGroups =
      query === undefined ?
        media.default :
      query in media ?
        media[query] :
        media[query] = [];

    let targetPriority: SelectorContent =
      priority in targetQuery ?
        targetQuery[priority] :
        targetQuery[priority] = [];

    const items = [] as ExplicitStyle[];

    for(const item of block.sequence)
      if(item instanceof ExplicitStyle && item.invariant)
        items.push(item);

    const styles = items.map(style => {
      let styleKey = style.name;

      if(typeof styleKey == "string")
        styleKey = styleKey.replace(/([A-Z]+)/g, "-$1").toLowerCase();

      const line = `${styleKey}: ${style.value}`;

      if(style.important)
        return `${line} !important`;

      return line;
    })

    let selection = "";
    do {
      let select = block.forSelector!.join("");
      if(selection)
        select += " " + selection;
      selection = select;
    }
    while(block = block.onlyWithin!);

    targetPriority.push([selection, styles])
  }

  return media;
}

function createSyntax(
  media: BunchOf<MediaGroups>,
  pretty: boolean
){
  const lines = [];

  for(const query in media){
    const priorityBunches = media[query].filter(x => x);

    for(const bunch of priorityBunches)
      for(const [ name, styles ] of bunch){
        if(pretty){
          let rules = styles.map(x => `\t${x};`);
          lines.push(name + " { ", ...rules, "}")
        }
        else {
          const block = styles.join("; ");
          lines.push(`${name} { ${block} }`)
        }
      }
  }

  const content = lines.map(x => "\t" + x).join("\n")

  return `\n${content}\n`
}