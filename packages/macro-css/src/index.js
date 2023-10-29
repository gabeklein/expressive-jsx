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

import contingent from './contingent';
import elements from './elements';
import classes from './classes';
import media from './media';

export const css = {
  ...contingent,
  ...elements,
  ...classes,
  ...media
}