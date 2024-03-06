import { FunctionContext } from './context';
import * as Macros from './macros';
import { camelToDash } from './macros/util';
import Plugin from './plugin';
import { setClassNames } from './syntax/className';
import { extractProperty, forwardFunctionProps, hasChildren, setTagName } from './syntax/element';
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
          const { path, using } = element;
          const names: t.Expression[] = [];
          const used = new Set(using);
          let forwardProps;

          for(const context of used){
            if(context instanceof FunctionContext)
              forwardProps = forwardFunctionProps(path);

            let { className } = context;
        
            if(typeof className == 'string')
              className = t.stringLiteral(className);
        
            if(className)
              names.push(className);
          }

          for(const context of used){
            context.dependant.forEach(x => used.add(x));
            styles.add(context);
          }
        
          if(names.length){
            if(forwardProps)
              names.unshift(
                extractProperty(forwardProps, path.scope, "className")
              );
        
            setClassNames(path, names);
          }

          if(hasChildren(path) && forwardProps)
            path.node.children.push(
              t.jsxExpressionContainer(
                extractProperty(forwardProps, path.scope, "children")
              )
            );

          if(!hasProperTagName(path))
            setTagName(path, "div");
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