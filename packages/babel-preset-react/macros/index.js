export * from './border';
export * from './color';
export * from './flex';
export * from './gradient';
export * from './grid';
export * from './image';
export * from './margins';
export * from './position';
export * from './radius';
export * from './scalar';
export * from './shadow';
export * from './size';
export * from './font';

import contingent from './css/contingent';
import pseudo from './css/pseudo';
import media from './css/media';

export const css = {
  ...contingent,
  ...pseudo,
  ...media
}