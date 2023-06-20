import { appendUnitToN } from './units';

const EXPORT = exports;

const EXPECTS_AUTO = [
  "gap",
  "top",
  "left",
  "right",
  "bottom",
  "width",
  "height",
  "maxWidth",
  "maxHeight",
  "minWidth",
  "minHeight",
  "fontSize",
  "lineHeight",
  "outlineWidth",
  "borderRadius",
  "backgroundSize"
];

for(const key of EXPECTS_AUTO)
  EXPORT[key] = nToNUnits;

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

