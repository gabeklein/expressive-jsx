import { BabelFile, BabelFileMetadata, BabelFileResult, NodePath, PluginObj, PluginPass } from '@babel/core';
import { Function, Identifier } from '@babel/types';

import { Context } from '../context';
import Plugin from '../plugin';
import { componentProp, componentProps } from '../syntax/component';
import { hasProp, spreadProps } from '../syntax/jsx';
import { uniqueIdentifier } from '../syntax/names';
import t from '../types';
import { addClassName, fixTagName, getClassName } from './jsx';
import * as Macros from './macros';
import { byPriority, isInUse, toCss, toSelector } from './styles';

export interface Options extends Plugin.Options {
  cssModule?: string;
}

interface State extends PluginPass {
  file: BabelFile & {
    metadata: Preset.MetaData;
  };
}

declare namespace Preset {
  export { Options };
  export interface Meta extends BabelFileMetadata {
    css: string;
  }
  export interface Result extends BabelFileResult {
    metadata: Meta;
    code: string;
  }
  export interface MetaData {
    readonly css: string;
    styles: Map<string, Context>;
  }
}

function Preset(_compiler: any, options: Preset.Options = {} as any): any {
  const { cssModule } = options;

  let cssObject: Identifier | undefined;

  Object.assign(t, _compiler.types);

  return {
    plugins: [
      [Plugin, <Plugin.Options>{
        ...options,
        macros: [
          Macros,
          ...options.macros || []
        ],
        apply(path, using, state){
          const used = new Set(using);

          let forward: NodePath<Function> | undefined;
       
          for(const define of used){
            const className = getClassName(define, cssObject);

            if(className)
              addClassName(path, className, options);

            if(define.path.isFunction())
              forward = define.path;
          }

          for(const context of used){
            const { styles } = state.file.metadata as Preset.MetaData;
            const key = toSelector(context);

            context.children.forEach(x => used.add(x));
            styles.set(key, context);
          }

          if(forward){
            spreadProps(path, componentProps(forward));

            if(hasProp(path, "className"))
              addClassName(path, componentProp(path, "className"), options)
          }

          fixTagName(path);
        },
      }],
      [<PluginObj<State>>{
        visitor: {
          Program: {
            enter(path, state){
              if(cssModule)
                cssObject = uniqueIdentifier(path.scope, "css");
  
              Object.defineProperties(state.file.metadata, {
                styles: {
                  enumerable: true,
                  value: new Map<string, Context>()
                },
                css: {
                  enumerable: true,
                  get(this: Preset.MetaData){
                    return Array
                      .from(this.styles.values())
                      .filter(isInUse)
                      .sort(byPriority)
                      .map(toCss)
                      .join("\n");
                  }
                }
              })
            },
            exit(path, state){
              const { styles } = state.file.metadata;

              if(cssObject && cssModule && styles.size)
                path.unshiftContainer("body", t.importDeclaration(
                  [t.importDefaultSpecifier(cssObject)],
                  t.stringLiteral(cssModule)
                ));
            }
          }
        },
      }]
    ]
  }
}

export default Preset;