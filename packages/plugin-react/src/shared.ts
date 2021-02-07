import { Expression } from '@babel/types';
import { createHash } from 'crypto';
import { StackFrame } from 'parse';
import { Options, BabelFile } from 'types';

const DEFAULTS: Options = {
  env: "web",
  styleMode: "compile",
  runtime: "@expressive/react",
  pragma: "react",
  output: "js",
  modifiers: []
};

class SharedSingleton {
  stack: StackFrame = null as any;
  currentFile: BabelFile = null as any
  opts = DEFAULTS;

  replaceAlias(value: string){
    if(value[0] !== "$")
      return value;

    const name = value.slice(1);
    return (this.opts as any)[name];
  }
}

export const Shared = new SharedSingleton();

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