/** Sanitize className. Will filter and join arguments. */
export function classNames(){
  return Array.from(arguments).filter(Boolean).join(' ');
}

/**
 * Simple accumulator. Invokes argument; returns array of all data supplied to `push()`. 
 * 
 * @param {(item: any) => void) => void} accumulator - Accumulator function.
 */
export function collect(acc){
  const sum = [];
  acc(sum.push.bind(sum));
  return sum;
}