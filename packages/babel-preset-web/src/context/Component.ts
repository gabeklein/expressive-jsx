import { NodePath } from '@babel/traverse';
import { Function } from '@babel/types';

import { onExit } from '../plugin';
import { getName } from '../syntax/names';
import t from '../types';
import { getContext } from './Context';
import { Define } from './Define';

export class Component extends Define {
  constructor(public path: NodePath<Function>) {
    const name = getName(path);
    const context = getContext(path);

    super(name, context, path);

    this.define["this"] = this;

    onExit(path, () => {
      const body = path.get("body");

      if(body.isBlockStatement() && !body.get("body").length)
        body.pushContainer("body", t.expressionStatement(
          t.jsxElement(
            t.jsxOpeningElement(t.jsxIdentifier("this"), [], true),
            undefined, [], true
          )
        ));
    });
  }
}