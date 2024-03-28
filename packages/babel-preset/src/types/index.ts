import * as types from '@babel/types';

import * as assert from './assert';
import * as construct from './construct';
import * as jsx from './jsx';

const babel = {} as typeof types;

export default {
  ...babel,
  ...assert,
  ...construct,
  ...jsx,
}