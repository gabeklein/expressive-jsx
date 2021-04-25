import type { Expression } from '@babel/types';
import type { BunchOf, Options } from 'types';

export const DEFAULTS: Options = {
  env: "web",
  styleMode: "compile",
  runtime: "@expressive/react",
  pragma: "react",
  output: "js",
  modifiers: []
};

const m32 = Math.imul;

/**
 * "cyrb53" hashing function, lifted from stack-overflow.
 * Avoids needing to use "crypto" module.
 * 
 * https://stackoverflow.com/a/52171480/877165
 * */
export function hash(str = "", length = 3){
  const x = 0x85ebca6b, y = 0xc2b2ae35;
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;

  for(let i = 0, ch; i < str.length; i++){
    ch = str.charCodeAt(i);
    h1 = m32(h1 ^ ch, 0x9e3779b1);
    h2 = m32(h2 ^ ch, 0x5f356495);
  }

  h1 = m32(h1 ^ (h1>>>16), x) ^ m32(h2 ^ (h2>>>13), y);
  h2 = m32(h2 ^ (h2>>>16), x) ^ m32(h1 ^ (h1>>>13), y);

  const out = 0x100000000 * (0x1fffff & h2) + (h1>>>0);
  return out.toString(32).substring(0, length);
}

export function ensureArray<T>(a: T | T[]){
  return Array.isArray(a) ? a : [a];
}

export function inParenthesis(node: Expression): boolean {
  const { extra } = node as any;
  return extra ? extra.parenthesized === true : false;
}

export class Stack<T> {
  layer = {} as BunchOf<T>;

  stack(){
    return Object.assign(Object.create(this), {
      layer: Object.create(this.layer)
    })
  }

  set(key: string, value: T){
    this.layer[key] = value;
  }

  get(key: string){
    return this.layer[key];
  }

  has(key: string){
    return this.layer.hasOwnProperty(key);
  }
}

export function doUntilEmpty<T>(
  startingData: T,
  step: (next: T, enqueue: (data: T) => void) => void
){
  let i = 0;
  let queue = [startingData];

  do {
    let pending: T[] = [];
    const add = (next: T) => pending.push(next);

    step(queue[i], add);

    if(!pending.length)
      i++;
    else {
      queue = [ ...pending, ...queue.slice(i+1) ];
      i = 0;
    }
  }
  while(i in queue)
}