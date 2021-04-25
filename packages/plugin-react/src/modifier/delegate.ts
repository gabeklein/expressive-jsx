import { DefineVariant, ExplicitStyle } from 'handle';
import { parse } from 'parse';
import { _require } from 'syntax';
import { ParseErrors } from 'errors';

import { DelegateTypes } from './arguments';

import type { NodePath as Path } from '@babel/traverse';
import type { Statement } from '@babel/types';
import type { DefineElement } from 'handle/definition';
import type { Prop } from 'handle/attributes';
import type { BunchOf, DefineCompatibleBody, ModifyAction, Options } from 'types';

const Oops = ParseErrors({
  InlineModeNoVariants: "Cannot attach a CSS variant while styleMode is set to inline."
})

export class ModifyDelegate {
  arguments: Array<any>;
  body?: Path<Statement>;
  options: Options;
  done?: true;

  attrs = {} as BunchOf<any[]>;
  styles = {} as BunchOf<ExplicitStyle>;
  props = {} as BunchOf<Prop>;

  constructor(
    public target: DefineElement,
    public name: string,
    transform: ModifyAction,
    input: any[] | DefineCompatibleBody){

    let important = false;
    let args: any[];

    if(Array.isArray(input))
      args = input;
    else {
      args = new DelegateTypes().parse(input.node);
      this.body = input as Path<Statement>;
    }

    if(args[args.length - 1] == "!important"){
      important = true;
      args.pop();
    }

    this.options = target.context.opts;
    this.arguments = args;

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
    contingent: string,
    priority: number,
    usingBody?: Path<Statement>){

    const body = usingBody || this.body!;

    if(this.options.styleMode == "inline")
      throw Oops.InlineModeNoVariants(body.parentPath);

    const mod = new DefineVariant(
      this.target, contingent, priority
    );
    
    parse(mod, body);

    this.target.use(mod);

    return mod;
  }
}

function propertyModifierDefault(this: ModifyDelegate){
  const args = this.arguments.map(arg =>
    arg.value || arg.requires ? _require(arg.requires) : arg
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