import { jsxMustReturn } from './jsxMustReturn';
import { labelSpacing } from './labelSpacing';
import { noStyleTag } from './noStyleTag';
import { thisIsDeprecated } from './thisIsDeprecated';

export default {
  rules: {
    'jsx-must-return': jsxMustReturn,
    'no-style-tag': noStyleTag,
    'label-spacing': labelSpacing,
    'this-deprecated': thisIsDeprecated,
  },
  configs: {
    recommended: {
      plugins: ['@expressive/jsx'],
      rules: {
        '@expressive/jsx/jsx-must-return': 'error',
        '@expressive/jsx/no-style-tag': 'error',
        '@expressive/jsx/label-spacing': 'warn',
        '@expressive/jsx/this-deprecated': 'warn',
      }
    }
  }
}