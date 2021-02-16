import { ContingentModifier, ElementInline, ElementModifier, ExplicitStyle } from 'handle';
import { _require } from 'syntax';

import { DelegateTypes } from './arguments';

import type { Statement } from '@babel/types';
import type { AttributeBody, Prop } from 'handle/attributes';
import type { BunchOf, ModiferBody, ModifyAction } from 'types';

export class ModifyDelegate {
  arguments?: Array<any>
  priority?: number;
  done?: true;
  body?: ModiferBody;

  attrs = {} as BunchOf<any[]>;
  styles = {} as BunchOf<ExplicitStyle>;
  props = {} as BunchOf<Prop>;

  constructor(
    public target: AttributeBody,
    public name: string,
    transform: ModifyAction,
    input: any[] | ModiferBody){

    let important = false;
    let args: any[];

    if(Array.isArray(input))
      args = input;
    else {
      args = new DelegateTypes().parse(input);
      this.body = input;
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
      for(const name in style){
        const item = style[name];
        this.styles[name] = 
          new ExplicitStyle(name, item, important);
      }

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
    priority?: number,
    usingBody?: Statement){

    const { target } = this;
    const mod = new ContingentModifier(
      this.target.context,
      this.target as any,
      contingent
    )

    mod.priority = priority || this.priority;
    mod.parseNodes(usingBody || this.body!);

    if(target instanceof ElementInline)
      target.modifiers.push(mod);

    else if(target instanceof ElementModifier)
      target.alsoApplies.push(mod);

    else if(
      target instanceof ContingentModifier && 
      target.anchor instanceof ElementInline
    )
      target.anchor.modifiers.push(mod);

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