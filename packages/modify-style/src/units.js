import { nToNUnits } from './util';

const EXPORT = exports;

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
    "fontSize",
    "lineHeight",
    "outlineWidth",
    "borderRadius",
    "backgroundSize"
]){
    EXPORT[style] = nToNUnits;
}