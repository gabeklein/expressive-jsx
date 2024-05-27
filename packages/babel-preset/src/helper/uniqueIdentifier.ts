import { Scope } from '@babel/traverse';
import t from '../types';

export function uniqueIdentifier(scope: Scope, name = "temp") {
  let uid = name;
  let i = 0;

  while (
    scope.hasLabel(uid) ||
    scope.hasBinding(uid) ||
    scope.hasGlobal(uid)) {
    uid = name + ++i;
  };

  if (i > 1)
    uid = name + i;

  return t.identifier(uid);
}