import { Expression } from '@babel/types';
import { Options } from 'types';

export const DEFAULTS: Options = {
  env: "web",
  styleMode: "compile",
  runtime: "@expressive/react",
  pragma: "react",
  output: "js",
  modifiers: []
};

/**
 * "cyrb53" hashing function, lifted from stack-overflow.
 * Avoids needing to use "crypto" module.
 * 
 * https://stackoverflow.com/a/52171480/877165
 * */
export function hash(str = "", length = 3, seed = 0){
  let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
  for (let i = 0, ch; i < str.length; i++) {
      ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1>>>16), 2246822507) ^ Math.imul(h2 ^ (h2>>>13), 3266489909);
  h2 = Math.imul(h2 ^ (h2>>>16), 2246822507) ^ Math.imul(h1 ^ (h1>>>13), 3266489909);
  const out = 4294967296 * (2097151 & h2) + (h1>>>0);
  return out.toString(32).substring(0, length);
};

export function ensureArray<T>(a: T | T[]){
  return Array.isArray(a) ? a : [a];
}

export function inParenthesis(node: Expression): boolean {
  const { extra } = node as any;
  return extra ? extra.parenthesized === true : false;
}