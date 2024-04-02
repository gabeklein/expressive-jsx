import { addUnit } from '../util';

const CORNER_MATRIX = {
  top: [1, 1, 0, 0],
  left: [1, 0, 0, 1],
  right: [0, 1, 1, 0],
  bottom: [0, 0, 1, 1]
}

export function radius(dir, r1, r2){
  let value = "";

  if(dir == "round")
    value = 999;

  else if(r1 === undefined)
    value = dir;

  else if(typeof dir == "string"){
    let [d1, d2] = dir.split('-');
    let matrix = CORNER_MATRIX[d1];

    if(d2)
      matrix = matrix.map((dir, i) => {
        return CORNER_MATRIX[d2][i] ? dir : 0
      });

    const radii = matrix.map(b => {
      return (b ? r1 : r2) || 0
    })

    value = radii.map(addUnit).join(" ");
  }

  return {
    borderRadius: addUnit(value)
  }
}

export function circle(a){
  return {
    borderRadius: a / 2,
    size: a
  }
}