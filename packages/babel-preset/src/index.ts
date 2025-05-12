import { BabelFile, BabelFileMetadata, BabelFileResult, PluginPass } from '@babel/core';
import { Identifier } from '@babel/types';
import { Plugin, Context, Macro } from '@expressive/babel-plugin-jsx';

import { CSSPlugin } from './cssPlugin';
import * as DefaultMacros from './macros';
import t from './types';

export interface Options {
  cssModule?: string;
  macros?: (Record<string, Macro> | false)[];
  define?: Record<string, Context>[];
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
    readonly cssModuleId?: Identifier;
    readonly styles: Map<string, Context>;
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
    macros.push(DefaultMacros);

  return {
    plugins: [
      [Plugin, { ...options, macros }],
      [CSSPlugin, options]
    ]
  }
}

export default Preset;