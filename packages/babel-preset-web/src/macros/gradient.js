import { camelToDash } from './util';

import chroma from 'chroma-js';
import easingCoordinates from 'easing-coordinates';

// const timingFunctions = [
//   'ease',
//   'ease-in',
//   'ease-out',
//   'ease-in-out',
//   'cubic-bezier',
//   'steps'
// ]

export function easingGradient(direction, from, timing, to, stops = 13){
  direction = direction.replace("-", " ");
  timing = camelToDash(timing);
  [from, to] = normalize(from, to);

  const output = [ direction ];
  const coordinates =
    easingCoordinates.easingCoordinates(
      timing, stops - 1
    )

  for(const xy of coordinates){
    const {x: progress, y: delta} = xy;

    let color = roundHslAlpha(
      chroma.mix(from, to, delta, "lrgb").css("hsl")
    )

    if(progress % 1)
      color += " " + (progress * 100).toFixed(2) + "%";

    output.push(color);
  }

  return {
    backgroundImage: `linear-gradient(${ output.join(", ") })`
  }
}

function getBeforeParenthesisMaybe(str){
  return str.indexOf('(') !== -1
    ? str.substring(0, str.indexOf('('))
    : str
}

function getParenthesisInsides(str){
  return str.match(/\((.*)\)/).pop();
}

function roundHslAlpha(color){
  const prefix = getBeforeParenthesisMaybe(color)
  const values = getParenthesisInsides(color)
  .split(',')
  .map(string => (
    string.includes('%')
      ? string.trim() 
      : string.length > 4
        ? Number(string).toFixed(3)
        : string
  ))
  return `${ prefix }(${ values.join(', ') })`
}

function normalize(...colors){
  return colors.map((color, i) => (
    color === 'transparent'
      ? chroma(colors[Math.abs(i - 1)]).alpha(0).css('rgb')
      : color
  ))
}