import { ParseErrors } from 'errors';
import { ExplicitStyle } from 'handle/attributes';
import { DefineVariant } from 'handle/definition';
import * as $ from 'syntax';

import { parse as parseArguments } from './arguments';
import { parse } from './body';

import type * as t from 'syntax/types';
import type { Define } from 'handle/definition';
import type { Prop } from 'handle/attributes';
import type { BunchOf, DefineBodyCompat, ModifyAction } from 'types';

const Oops = ParseErrors({
  InlineModeNoVariants: "Cannot attach a CSS variant while styleMode is set to inline."
})

export class ModifyDelegate {
  arguments: Array<any>;
  body?: t.Path<t.Statement>;
  inlineOnly: boolean;
  done?: true;

  attrs = {} as BunchOf<any[]>;
  styles = {} as BunchOf<ExplicitStyle>;
  props = {} as BunchOf<Prop>;

  constructor(
    public target: Define,
    public name: string,
    transform: ModifyAction,
    input: any[] | DefineBodyCompat){

    let important = false;
    let args: any[];

    if(Array.isArray(input))
      args = input;
    else {
      args = parseArguments(input.node);
      this.body = input as t.Path<t.Statement>;
    }

    if(args[args.length - 1] == "!important"){
      important = true;
      args.pop();
    }

    this.arguments = args;
    this.inlineOnly = target.context.opts.styleMode == "inline";

    if(!transform)
      transform = propertyModifierDefault;

    const output = transform.apply(this, args);

    if(!output || this.done)
      return;

    const { attrs, style } = output;

    if(style)
      for(const name in style)
        this.styles[name] = 
          new ExplicitStyle(name, style[name], important);

    if(attrs)
      for(const name in attrs){
        let args: any[] = attrs[name];

        if(!Array.isArray(args))
          args = [args];

        if(important)
          args.push("!important");
          
        this.attrs[name] = args;
      }
  }

  setContingent(
    select: string | string[],
    priority: number,
    usingBody?: t.Path<t.Statement>){

    const { target } = this;
    const body = usingBody || this.body!;

    if(this.inlineOnly)
      throw Oops.InlineModeNoVariants(body.parentPath);

    const mod = new DefineVariant(target, select, priority);

    parse(mod, body);
    target.use(mod);

    return mod;
  }
}

function propertyModifierDefault(this: ModifyDelegate){
  const args = this.arguments.map(arg =>
    arg.value || arg.requires ? $.requires(arg.requires) : arg
  )

  const output =
    args.length == 1 || typeof args[0] == "object"
      ? args[0]
      : Array.from(args).join(" ")

  return {
    style: {
      [this.name]: output
    }
  }
}