export * from './border'
export * from './radius'
export * from './coloration'
export * from './flex'
export * from './gradient'
export * from './grid'
export * from './image'
export * from './macros'
export * from './margins'
export * from './media'
export * from './position'
export * from './scalar'
export * from './size'
export * from './shadow'
export * from './text'

import * as Color from './colors'
import * as contingent from './contingent';
import * as elements from './elements';
import * as classes from './classes';

export const css = {
  ...contingent,
  ...elements,
  ...classes
}

export { Color }