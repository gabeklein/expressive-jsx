import * as Macros from './macros';
import { camelToDash } from './macros/util';
import Plugin from './plugin';
import { hasProperTagName } from './syntax/tags';
import * as t from './types';

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
          const { path, using, this: component } = element;
          const used = new Set(using);
       
          if(component)
            element.node.openingElement.attributes.unshift(
              t.jsxSpreadAttribute(component.getProps())
            )

          for(const { className } of used)
            if(className)
              element.addClassName(className);

          for(const context of used){
            context.dependant.forEach(x => used.add(x));
            styles.add(context);
          }

          if(component){
            const { children } = path.node;

            if(element.getProp("className"))
              element.addClassName(component.getProp("className"))
  
            if(children.length)
              children.push(
                t.jsxExpressionContainer(
                  component.getProp("children")
                )
              );
          }

          if(!hasProperTagName(path))
            element.setTagName("div");
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