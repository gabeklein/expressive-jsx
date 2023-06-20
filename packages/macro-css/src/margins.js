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
        [kind + a]: aIn,
        [kind + b]: bIn || aIn
      })
  }

  for(const side of ["Top", "Left", "Right", "Bottom"]){
    EXPORT[kind + side] =
    EXPORT[kind + side[0]] =
      (...args) => ({
        [kind + side]: appendUnitToN(...args)
      })
  }

  EXPORT[kind] =
    function(keyword){
      let value;

      if(arguments.length == 1 && keyword == "auto" || keyword == "none" || / /.test(keyword))
        value = keyword
      else
        value = Array.from(arguments).map(x => appendUnitToN(x)).join(" ")

      return {
        [kind]: value
      }
    }
  }