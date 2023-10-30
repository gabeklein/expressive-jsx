export * from './border'
export * from './color'
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
export * from './font'

import contingent from './contingent';
import pseudo from './pseudo';
import media from './media';

export const css = {
  ...contingent,
  ...pseudo,
  ...media
}