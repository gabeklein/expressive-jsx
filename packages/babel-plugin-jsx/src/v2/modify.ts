import { NodePath } from "@babel/traverse";
import { ExpressionStatement } from "@babel/types";
import { Define } from "./define";
import { parse } from "parse/arguments";
import * as $ from 'syntax';

export interface ModifyDelegate {
  target: Define;
  name: string;
  body?: NodePath<ExpressionStatement>;
}

export type ModifyAction =
  (this: ModifyDelegate, ...args: any[]) => Record<string, any> | void;

export function handleModifier(
  name: string,
  target: Define,
  body: NodePath<ExpressionStatement>){

  const { context } = target;
  const queue = [{
    name,
    body,
    args: parse(body.node)
  } as {
    name: string,
    body?: NodePath<ExpressionStatement>,
    args: any[]
  }];

  while(queue.length){
    const { name, body, args } = queue.pop()!;
    const transform = context.getHandler(name);

    function addStyle(name: string, ...args: any[]){
      const parsed: any[] = args.map(arg => arg.value || (
        arg.requires ? $.requires(arg.requires) : arg
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