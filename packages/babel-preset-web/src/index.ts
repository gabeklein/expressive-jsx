import * as Macros from './macros';
import { camelToDash } from './macros/util';
import Plugin from './plugin';
import { HTML_TAGS } from './syntax/tags';
import { t } from './types';

namespace Preset {
  export interface Options extends Plugin.Options {
    onStyleSheet?(css: string): void;
  }
}

function Preset(_compiler: any, options: Preset.Options = {} as any): any {
  Object.assign(t, _compiler.types);

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
          const {
            using,
            this: component,
            node: {
              children,
              openingElement: {
                name,
                attributes
              }
            }
          } = element;

          const used = new Set(using);
       
          if(component)
            attributes.unshift(
              t.jsxSpreadAttribute(component.getProps())
            )

          for(const define of used)
            if(define.className)
              element.addClassName(define.className);

          for(const context of used){
            context.dependant.forEach(x => used.add(x));
            styles.add(context);
          }

          if(component){
            if(element.getProp("className"))
              element.addClassName(
                component.getProp("className")
              )
  
            if(children.length)
              children.push(
                t.jsxExpressionContainer(
                  component.getProp("children")
                )
              )
          }

          if(t.isJSXIdentifier(name)
          && !/^[A-Z]/.test(name.name)
          && !HTML_TAGS.includes(name.name))
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