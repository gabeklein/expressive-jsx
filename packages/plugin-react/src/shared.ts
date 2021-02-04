import { Node, Expression, File } from '@babel/types';
import { createHash } from 'crypto';

const { isArray } = Array;

interface Options {
  compact_vars?: true;
  env: "native" | "web";
  output: "js" | "jsx";
  styleMode: "compile";
  formatStyles: any;
}

export const ensureArray = <T>(a: T | T[]) => Array.isArray(a) ? a : [a];

export interface BabelFile extends File {
  buildCodeFrameError<TError extends Error>(node: Node, msg: string, Error?: new (msg: string) => TError): TError;
}

export interface SharedSingleton {
  stack: any
  opts?: any
  state: {
    expressive_for_used?: true;
  }
  currentFile: BabelFile
  styledApplicationComponentName?: string
}

export const Shared = {} as SharedSingleton;

export const env = process.env || {
  NODE_ENV: "production"
};

export const Opts: Options = {
  env: "web",
  styleMode: "compile",
  output: "js",
  formatStyles: ""
}

export function hash(data: string, length: number = 3){
  return createHash("md5")		
    .update(data)		
    .digest('hex')		
    .substring(0, length)
}

export function toArray<T> (value: T | T[]): T[] {
  return value !== undefined
    ? isArray(value)
      ? value
      : [value]
    : [];
}

export function inParenthesis(node: Expression): boolean {
  const { extra } = node as any;
  return extra ? extra.parenthesized === true : false;
}