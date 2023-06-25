import { ExpressionStatement } from '@babel/types';
import { parse } from 'parse/arguments';
import { getName } from 'parse/labels';
import * as t from 'syntax';

import { Context } from './context';
import { Define } from './define';

export interface ModifyDelegate {
  target: Define;
  name: string;
  body?: t.Path<ExpressionStatement>;
}

export type ModifyAction =
  (this: ModifyDelegate, ...args: any[]) => Record<string, any> | void;

export function handleLabel(path: t.Path<t.LabeledStatement>){
  const context = Context.get(path);
  let body = path.get("body");

  let key = getName(path);

  while(body.isLabeledStatement()){
    key += body.node.label.name;
    body.data = {};
    body = body.get("body");
  }

  if(body.isIfStatement())
    key += "if";

  if(body.isBlockStatement()){
    path.data = {
      context: new Context(key, context)
    };
    return;
  }
  
  if(body.isExpressionStatement()){
    path.data = { context };
    handleModifier(key, context.define, body);
  }
}

function handleModifier(
  name: string,
  target: Define,
  body: t.Path<ExpressionStatement>){

  const { context } = target;
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
    const transform = context.getHandler(name);

    function addStyle(name: string, ...args: any[]){
      const parsed: any[] = args.map(arg => arg.value || (
        arg.requires ? t.requires(arg.requires) : arg
      ))
    
      target.styles[name] =
        parsed.length == 1 || typeof parsed[0] == "object"
          ? parsed[0] : Array.from(parsed).join(" ");
    }

    if(!transform){
      addStyle(name, ...args);
      return;
    }

    const output = transform.apply({
      target,
      name,
      body
    }, args);

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