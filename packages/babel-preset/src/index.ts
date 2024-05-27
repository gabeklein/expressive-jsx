import { BabelFile, BabelFileMetadata, BabelFileResult, PluginPass } from '@babel/core';

import { CSSPlugin } from './css';
import * as Macros from './macros';
import Plugin, { Context, Macro } from './plugin';
import t from './types';

export interface Options {
  cssModule?: string;
  macros?: (Record<string, Macro> | false)[];
  define?: Record<string, Context>[];
  polyfill?: string | null;
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
    Meta,
    MetaData,
    Options,
    Result
  };
}

export function Preset(_compiler: any, options: Preset.Options = {} as any): any {
  const { macros = [] } = options;

  Object.assign(t, _compiler.types);

  if(!macros.some(x => x === false))
    macros.push(Macros);

  return {
    plugins: [
      [Plugin, { ...options, macros }],
      [CSSPlugin, options]
    ]
  }
}

export default Preset;