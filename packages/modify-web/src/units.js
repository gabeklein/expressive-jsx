const EXPORT = exports;

import { appendUnitToN } from './util';

for(const style of [
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
    "marginTop",
    "marginBottom",
    "marginLeft",
    "marginRight",
    "paddingLeft",
    "paddingRight",
    "paddingTop",
    "paddingBottom",
    "fontSize",
    "lineHeight",
    "outlineWidth",
    "borderRadius",
    "backgroundSize"
]) 
EXPORT[style] = nToNUnits;

function nToNUnits(value, unit) {
    return {
        style: {
            [this.name]: appendUnitToN(value, unit)
        }
    }
}

