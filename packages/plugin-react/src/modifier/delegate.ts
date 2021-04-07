import { DefineContingent, ExplicitStyle } from 'handle';
import { parse, ParseContent } from 'parse';
import { _require } from 'syntax';

import { DelegateTypes } from './arguments';

import type { Element } from 'handle';
import type { NodePath as Path } from '@babel/traverse';
import type { Statement } from '@babel/types';
import type { Prop } from 'handle/attributes';
import type { BunchOf, ModifyBodyPath, ModifyAction } from 'types';

export class ModifyDelegate {
  arguments?: Array<any>
  done?: true;
  body?: Path<Statement>;

  attrs = {} as BunchOf<any[]>;
  styles = {} as BunchOf<ExplicitStyle>;
  props = {} as BunchOf<Prop>;

  constructor(
    public target: Element,
    public name: string,
    transform: ModifyAction,
    input: any[] | ModifyBodyPath){

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

  identifier(name: string){
    return this.target.context.Imports.ensureUIDIdentifier(name);
  }

  setContingent(
    contingent: string,
    priority: number,
    usingBody?: Path<Statement>){

    const { target } = this;
    const mod = new DefineContingent(
      target.context, target as any, contingent
    );

    mod.priority = priority;
    parse(mod as any, ParseContent, usingBody || this.body!)

    target.applyModifier(mod);

    return mod;
  }
}

function propertyModifierDefault(
  this: ModifyDelegate){

  const args = this.arguments!.map(arg => {
    const { value, requires } = arg;

    if(value)
      return value;
    else if(requires)
      return _require(requires);
    else
      return arg;
  })

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