import Plugin from "./plugin";
import * as Macros from "./macros";

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
          const using = new Set(element.using);

          using.forEach(context => {
            styles.add(context);
            context.dependant.forEach(x => using.add(x));
          });
        },
      }],
      [{
        visitor: {
          Program: {
            exit(){
              const css = [] as string[];

              for(const context of styles){
                if(!Object.keys(context.styles).length)
                  continue;
            
                const styles = [] as string[];
            
                for(const [name, value] of Object.entries(context.styles))
                  styles.push(`  ${name}: ${value};`);
            
                css.push(context.selector + " {\n" + styles.join("\n") + "\n}");
              }

              if(options.onStyleSheet)
                options.onStyleSheet(css.join("\n"));

              styles.clear();
            }
          }
        }
      }]
    ]
  }
}

export default Preset;