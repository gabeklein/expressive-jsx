import JSX, { Options } from '@expressive/babel-plugin-jsx';

import { addStyle } from './css';
import * as Macros from './macros';
import * as Pseudo from './pseudo';

const Preset = (_compiler: any, options: Options = {}) => {
  let { macros = [], output = "js", ...opts } = options;

  return {
    plugins: [
      [JSX, <Options>{
        ...opts,
        output,
        macros: [
          Macros,
          Pseudo,
          ...macros,
          { default: addStyle }
        ]
      }]
    ]
  }
}

export default Preset;
export { Options };