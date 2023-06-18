export * from './border'
export * from './coloration'
export * from './flex'
export * from './gradient'
export * from './grid'
export * from './image'
export * from './macros'
export * from './margins'
export * from './position'
export * from './radius'
export * from './scalar'
export * from './shadow'
export * from './size'
export * from './text'

import * as Color from './colors'
import * as contingent from './contingent';
import * as elements from './elements';
import * as classes from './classes';
import * as media from './media';

export const css = {
  ...contingent,
  ...elements,
  ...classes,
  ...media
}

export { Color }