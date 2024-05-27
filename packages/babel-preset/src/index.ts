import { BabelFile, BabelFileMetadata, BabelFileResult, PluginPass } from '@babel/core';

import { UseCSSPlugin } from './css';
import * as Macros from './macros';
import Plugin, { Context } from './plugin';
import t from './types';

export interface Options extends Plugin.Options {
  cssModule?: string;
}

export interface State extends PluginPass {
  file: BabelFile & {
    metadata: Preset.MetaData;
  };
}

export declare namespace Preset {
  interface Meta extends BabelFileMetadata {
    css: string;
  }
  interface Result extends BabelFileResult {
    metadata: Meta;
    code: string;
  }
  interface MetaData {
    readonly css: string;
    styles: Map<string, Context>;
  }

  export {
    Options,
    Meta,
    Result,
    MetaData
  };
}

export function Preset(_compiler: any, options: Preset.Options = {} as any): any {
  Object.assign(t, _compiler.types);

  return {
    plugins: [
      [Plugin, <Plugin.Options>{
        ...options,
        macros: [
          Macros,
          ...options.macros || []
        ]
      }],
      [UseCSSPlugin, options]
    ]
  }
}

export default Preset;