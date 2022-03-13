import { StackFrame } from 'context';
import type * as t from 'syntax/types';

export function getTarget(path: t.Path<any>){
  const context = StackFrame.get(path, true);
  const target = context.ambient;

  return target;
}