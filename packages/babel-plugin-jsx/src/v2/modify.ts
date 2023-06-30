import { ExpressionStatement } from '@babel/types';
import { parse } from 'parse/arguments';
import { getName } from 'parse/labels';
import * as t from 'syntax';

import { DefineContext } from './define';

export interface ModifyDelegate {
  target: DefineContext;
  name: string;
  body?: t.Path<ExpressionStatement>;
}

export type ModifyAction =
  (this: ModifyDelegate, ...args: any[]) => Record<string, any> | void;

export function handleLabel(path: t.Path<t.LabeledStatement>){
  const context = DefineContext.get(path);

  context.root.declared.add(context);

  let body = path.get("body");
  let name = getName(path);

  while(body.isLabeledStatement()){
    name += body.node.label.name;
    body.data = {};
    body = body.get("body");
  }

  if(body.isIfStatement())
    name += "if";

  if(body.isBlockStatement()){
    path.data = {
      context: new DefineContext(context, name)
    };
    return;
  }

  if(!body.isExpressionStatement())
    throw new Error("Invalid label");

  path.data = { context };

  const { macros } = context;
  const queue = [{
    name,
    body,
    args: parse(body.node)
  } as {
    name: string,
    body?: t.Path<ExpressionStatement>,
    args: any[]
  }];

  while(queue.length){
    const { name, body, args } = queue.pop()!;
    const [key, ...path] = name.split(".");

    let transform = macros[key] as ModifyAction | undefined;

    for(const key of path){
      if(!transform)
        break;

      transform = (transform as any)[key];
    }

    function addStyle(name: string, ...args: any[]){
      const parsed: any[] = args.map(arg => arg.value || (
        arg.requires ? t.requires(arg.requires) : arg
      ))
    
      context.styles[name] =
        parsed.length == 1 || typeof parsed[0] == "object"
          ? parsed[0] : Array.from(parsed).join(" ");
    }

    if(!transform){
      addStyle(name, ...args);
      return;
    }

    const output = transform.apply({ target: context, name, body }, args);

    if(!output)
      return;

    Object
      .entries(output)
      .reverse()
      .forEach(([key, value]) => {
        if(!value)
          return;

        if(!Array.isArray(value))
          value = [value];

        if(key === name)
          addStyle(key, ...value);
        else
          queue.push({
            name: key,
            args: value
          });
      });
  }
}