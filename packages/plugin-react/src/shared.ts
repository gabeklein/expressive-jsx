import { Expression } from '@babel/types';
import { createHash } from 'crypto';
import { Options, SharedSingleton } from 'types';

const DEFAULTS: Options = {
  env: "web",
  styleMode: "compile",
  runtime: "@expressive/react",
  pragma: "react",
  output: "js"
};

export const Shared: SharedSingleton = {
  stack: null as any,
  currentFile: null as any,
  opts: DEFAULTS
};

export function hash(data: string, length: number = 3){
  return createHash("md5")		
    .update(data)		
    .digest('hex')		
    .substring(0, length)
}

export function ensureArray<T>(a: T | T[]){
  return Array.isArray(a) ? a : [a];
}

export function inParenthesis(node: Expression): boolean {
  const { extra } = node as any;
  return extra ? extra.parenthesized === true : false;
}