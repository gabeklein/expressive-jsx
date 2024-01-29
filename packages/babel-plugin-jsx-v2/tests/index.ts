import { transformAsync } from '@babel/core';

import Plugin, { Options } from '../src';

export async function parse(source: string, options: Options){
  return transformAsync(source, {
    filename: '/test.js',
    plugins: [
      [Plugin, options]
    ]
  });
}