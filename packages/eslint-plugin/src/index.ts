import { jsxMustReturn } from './jsxMustReturn';
import { noStyleTag } from './noStyleTag';

export default {
  rules: {
    'jsx-must-return': jsxMustReturn,
    'no-style-tag': noStyleTag,
  },
  configs: {
    recommended: {
      plugins: ['@expressive/jsx'],
      rules: {
        '@expressive/jsx/jsx-must-return': 'error',
        '@expressive/jsx/no-style-tag': 'error'
      }
    }
  }
}