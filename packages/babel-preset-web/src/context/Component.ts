import { NodePath } from '@babel/traverse';
import { BlockStatement, Expression, Function } from '@babel/types';

import { onExit } from '../plugin';
import { getName } from '../syntax/names';
import t from '../types';
import { getContext } from './Context';
import { Define } from './Define';

export class Component extends Define {
  body: NodePath<BlockStatement | Expression>;

  constructor(public path: NodePath<Function>) {
    const name = getName(path);
    const context = getContext(path);
    const body = path.get("body");

    super(name, context, path);

    this.body = body;
    this.define["this"] = this;

    onExit(path, () => {
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