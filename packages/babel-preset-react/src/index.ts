import JSX, { Options } from '@expressive/babel-plugin-jsx';

import * as CSS from './macros';
import * as PSEUDO from './pseudo';
import { addStyle } from './css';

const Preset = (_compiler: any, options: Options = {}) => {
  let { macros = [], output = "js", ...opts } = options;

  return {
    plugins: [
      [JSX, <Options>{
        ...opts,
        output,
        macros: [
          CSS,
          PSEUDO,
          ...macros,
          { default: addStyle }
        ]
      }]
    ]
  }
}

export default Preset;
export { Options };