import { appendUnitToN } from './util';

function nToNUnits(value, unit) {
  if(value == "fill")
    value = "100%";

  if(value.named){
    unit = value.named;
    value = value.inner[0]
  }
  return {
    [this.name]: appendUnitToN(value, unit)
  }
}

export const gap = nToNUnits;
export const top = nToNUnits;
export const left = nToNUnits;
export const right = nToNUnits;
export const bottom = nToNUnits;
export const width = nToNUnits;
export const height = nToNUnits;
export const maxWidth = nToNUnits;
export const maxHeight = nToNUnits;
export const minWidth = nToNUnits;
export const minHeight = nToNUnits;
export const fontSize = nToNUnits;
export const lineHeight = nToNUnits;
export const outlineWidth = nToNUnits;
export const borderRadius = nToNUnits;
export const backgroundSize = nToNUnits;