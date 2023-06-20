import { ParseErrors } from 'errors';

import { parse } from './body';

import type * as t from 'syntax/types';
import type { Define } from 'handle/definition';
import type { DefineBodyCompat } from 'types';

const Oops = ParseErrors({
  InlineModeNoVariants: "Cannot attach a CSS variant while styleMode is set to inline."
})

export class ModifyDelegate {
  //target.context.opts.styleMode == "inline";
  inlineOnly = false;

  constructor(
    public target: Define,
    public name: string,
    public body: DefineBodyCompat){
  }

  setContingent(
    select: string | string[],
    priority: number,
    usingBody?: t.Path<t.Statement>){

    const body = usingBody || this.body!;

    if(this.inlineOnly)
      throw Oops.InlineModeNoVariants(body.parentPath);

    const mod = this.target.variant(select, priority);

    parse(mod, body);

    return mod;
  }
}