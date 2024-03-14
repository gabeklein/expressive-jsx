import type { Scope } from '@babel/traverse';

import { t } from '../types';

export function uniqueIdentifier(scope: Scope, name = "temp") {
  let uid = name;
  let i = 0;

  do {
    if(i > 0) uid = name + i;
    i++;
  } while (
    scope.hasLabel(uid) ||
    scope.hasBinding(uid) ||
    scope.hasGlobal(uid) ||
    scope.hasReference(uid)
  );

  return t.identifier(uid);
}