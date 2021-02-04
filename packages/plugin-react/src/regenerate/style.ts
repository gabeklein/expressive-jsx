import { expressionStatement, Statement, stringLiteral, templateElement, templateLiteral } from '@babel/types';
import { callExpress, memberExpress } from 'generate';
import { ExplicitStyle, Modifier } from 'handle';
import { Module } from 'regenerate';
import { BunchOf } from 'types';

type SelectorContent = [ string, string[] ][];
type MediaGroups = SelectorContent[];

export function writeProvideStyleStatement(module: Module, opts: any){
  const media = organizeStyle(module.modifiersDeclared);
  const text = createSyntax(media, opts);
  insertStyleSyntax(module, text, opts);
}

function organizeStyle(modifiersDeclared: Set<Modifier>){
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

    const items = block.sequence.filter(style => "invariant" in style) as ExplicitStyle[];

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
  opts: any
){
  const lines = [];

  for(const query in media){
    const priorityBunches = media[query].filter(x => x);

    for(const bunch of priorityBunches)
      for(const [ name, styles ] of bunch){
        if(opts.printStyle == "pretty"){
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

function insertStyleSyntax(
  module: Module,
  computedStyle: string,
  opts: any
){
  const {
    path: program,
    lastInsertedElement: pivot,
    imports,
    relativeFileName
  } = module;

  const programBody = program.node.body;
  const polyfillModule = imports.ensure("$runtime", "default", "Styles");

  const filenameMaybe = opts.hot !== false
    ? [ stringLiteral(relativeFileName) ] : [];

  const provideStatement =
    expressionStatement(
      callExpress(
        memberExpress(polyfillModule, "include"),
        templateLiteral([
          templateElement({raw: computedStyle, cooked: computedStyle}, true)
        ], []),
        ...filenameMaybe
      )
    )

  const provideStatementGoesAfter = pivot!.getAncestry().reverse()[1];
  const index = programBody.indexOf(provideStatementGoesAfter.node as Statement);

  programBody.splice(index + 1, 0, provideStatement)
}