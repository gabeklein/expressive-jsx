// export * from '@babel/types';

// export {
//   VisitNodeObject,
//   NodePath,
//   Scope,
//   Hub
// } from '@babel/traverse';

// export {
//   PluginObj,
//   PluginPass
// } from '@babel/core';

// export * from './assert';
// export * from './construct';
// export * from './jsx';

import * as types from '@babel/types';

import * as assert from './assert';
import * as construct from './construct';
import * as jsx from './jsx';

const babel = {} as typeof types;

export const t = {
  ...babel,
  ...assert,
  ...construct,
  ...jsx,
}