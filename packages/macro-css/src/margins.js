import { rect } from './util';
import { appendUnitToN } from './units';

const EXPORT = exports;

for (const kind of [
  "margin",
  "padding"
]) {
  for (const [direction, a, b] of [
    ["Vertical", "Top", "Bottom"],
    ["Horizontal", "Left", "Right"]
  ]){
    EXPORT[kind + direction] = // marginHorizontal
    EXPORT[kind + direction[0]] = // marginH
      (aIn, bIn) => ({
        attrs: {
          [kind + a]: aIn,
          [kind + b]: bIn || aIn
        }
      })
  }

  for(const side of ["Top", "Left", "Right", "Bottom"]){
    EXPORT[kind + side] =
    EXPORT[kind + side[0]] =
      handleUnits(kind + side)
  }

  EXPORT[kind] =
    function(keyword){
      let value;

      if(this.arguments.length == 1 && keyword == "auto" || keyword == "none" || / /.test(keyword))
        value = keyword
      else {
        let args = rect(...this.arguments);
        if(args.length == 2)
          args = args.slice(0, 2)
        value = args.map(x => appendUnitToN(x)).join(" ")
      }

      return {
        style: { [kind]: value }
      }
    }
}

function handleUnits(name) {
  return function(){
    return {
      style: {
        [name]: appendUnitToN.apply(this, this.arguments)
      }
    }
  }
}