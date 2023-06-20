import { ParseErrors } from 'errors';
import { Style } from 'handle/attributes';
import { Define } from 'handle/definition';
import * as $ from 'syntax';
import { doUntilEmpty } from 'utility';

import { parse as parseArguments } from './arguments';
import { parse } from './body';

import type * as t from 'syntax/types';
import type { DefineBodyCompat, ModifyAction } from 'types';

export const Oops = ParseErrors({
  BadModifierName: "Modifier name cannot start with _ symbol!",
  InlineModeNoVariants: "Cannot attach a CSS variant while styleMode is set to inline.",
  DollarSignDeprecated: "Dollar-sign macros are deprecated. Did you mean to use a namespace?"
});

export function getName(
  path: t.Path<t.LabeledStatement>){

  const { name } = path.get("label").node;

  if(name.startsWith("_"))
    throw Oops.BadModifierName(path);

  if(name.startsWith("$"))
    return name.replace(/^\$/, "--");

  return name;
}

export function handleDefine(
  target: Define,
  path: t.Path<t.LabeledStatement>){

  let key = getName(path);
  let body = path.get('body') as t.Path<t.Statement>;

  if(body.isBlockStatement()){
    const mod = new Define(target.context, key);

    target.provide(mod);
    parse(mod, body);
    return;
  }

  const { context } = target;

  while($.is(body, "LabeledStatement")){
    key = `${key}.${body.node.label.name}`;
    body = body.get("body") as t.Path<t.Statement>;
  }

  if($.is(body, "IfStatement"))
    key = `${key}.if`;
  
  const handler = context.getHandler(key);
  const initial = [key, handler, body] as [
    key: string,
    action: ModifyAction | undefined,
    body: DefineBodyCompat
  ];

  doUntilEmpty(initial, ([name, transform, body], enqueue) => {
    let important = false;
    const args = parseArguments(body.node);

    if(args[args.length - 1] == "!important"){
      important = true;
      args.pop();
    }

    if(!transform){
      const parsed: any[] = args.map(arg => (
        arg.value || arg.requires ? $.requires(arg.requires) : arg
      ))
    
      const output = parsed.length == 1 || typeof parsed[0] == "object"
        ? parsed[0] : Array.from(parsed).join(" ");
  
      target.add(
        new Style(name, output, important)
      )

      return;
    }

    const mod = new ModifyDelegate(target, name, body);
    const output = transform.apply(mod, args);

    if(!output)
      return;

    const { style, attrs } = output;

    for(const name in attrs){
      let args: any[] = attrs[name];

      if(!Array.isArray(args))
        args = [args];

      if(important)
        args.push("!important");
        
      attrs[name] = args;
    }

    if(style)
      for(const name in style)
        target.add(
          new Style(name, style[name], important)
        ) 

    if(attrs)
      Object.entries(attrs).forEach(([name, value]) => {
        if(!value)
          return;
        
        const handler = context.getHandler(name, name === key);

        enqueue([name, handler, value]);
      });
  });
}

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