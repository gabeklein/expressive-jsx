import * as Macros from './macros';
import { camelToDash } from './macros/util';
import Plugin from './plugin';

namespace Preset {
  export interface Options extends Plugin.Options {
    onStyleSheet?(css: string): void;
  }
}

function Preset(_compiler: any, options: Preset.Options = {}): any {
  let { macros = [], ...opts } = options;
  const styles = new Set<Plugin.DefineContext>();

  return {
    plugins: [
      [Plugin, <Plugin.Options>{
        ...opts,
        macros: [
          Macros,
          ...macros
        ],
        apply(element){
          const used = new Set(element.using);

          used.forEach(context => {
            context.dependant.forEach(x => used.add(x));
            styles.add(context);
          });
        },
      }],
      [{
        visitor: {
          Program: {
            exit(){
              if(options.onStyleSheet)
                options.onStyleSheet(print(styles));

              styles.clear();
            }
          }
        }
      }]
    ]
  }
}

function print(styles: Iterable<Plugin.DefineContext>){
  const css = [] as string[];

  for(const context of styles){
    if(!Object.keys(context.styles).length)
      continue;

    const styles = [] as string[];

    for(const [name, value] of Object.entries(context.styles))
      styles.push(`  ${camelToDash(name)}: ${value};`);

    css.push(context.selector + " {\n" + styles.join("\n") + "\n}");
  }

  return css.join("\n");
}

export default Preset;