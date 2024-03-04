import Plugin from "./plugin";
import * as Macros from "./macros";

namespace Preset {
  export interface Options extends Plugin.Options {}
}

function Preset(_compiler: any, options: Preset.Options = {}){
  let { macros = [], ...opts } = options;

  return {
    plugins: [
      [Plugin, <Plugin.Options>{
        ...opts,
        macros: [
          Macros,
          ...macros
        ]
      }]
    ]
  }
}

export default Preset;