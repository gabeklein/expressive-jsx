import { NodePath } from '@babel/traverse';
import { BlockStatement, Expression, Function } from '@babel/types';

import { onExit } from '../plugin';
import { getProp, getProps } from '../syntax/function';
import { getName } from '../syntax/names';
import { t } from '../types';
import { getContext } from './Context';
import { DefineContext } from './DefineContext';


export class FunctionContext extends DefineContext {
  body: NodePath<BlockStatement | Expression>;

  constructor(public path: NodePath<Function>) {
    const name = getName(path);
    const ctx = getContext(path);
    const body = path.get("body");

    super(name, ctx, path);

    this.body = body;
    this.define["this"] = this;

    onExit(path, () => {
      if (body.isBlockStatement() && body.get("body").length == 0)
        body.pushContainer("body", t.expressionStatement(
          t.jsxElement(
            t.jsxOpeningElement(t.jsxIdentifier("this"), [], true),
            undefined, [], true
          )
        ));
    });
  }

  get className() {
    if (!this.empty || this.dependant.length)
      return super.className;
  }

  getProp(name: string) {
    return getProp(this.path, name);
  }

  getProps() {
    return getProps(this.path);
  }
}
