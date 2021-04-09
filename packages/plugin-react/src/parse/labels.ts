import { ParseErrors } from 'errors';
import { DefineElement } from 'handle';
import { applyModifier } from 'modifier';
import { parse } from 'parse';

import type { NodePath as Path } from "@babel/traverse";
import type { LabeledStatement, Statement } from "@babel/types";
import type { Define } from "handle";

import { ParseContent } from "./schema";

const Oops = ParseErrors({
  BadInputModifier: "Modifier input of type {1} not supported here!",
  BadModifierName: "Modifier name cannot start with _ symbol!",
});

const RESERVED_BLOCKS = [
  "nthOfType",
  "onHover",
  "onActive",
  "onFocus",
  "after",
  "before",
  "afterOnHover",
  "beforeOnHover",
  "afterOnFocus",
  "beforeOnFocus",
  "afterOnActive",
  "beforeOnActive",
  "placeholder",
  "css"
];

export function parseDefineBlock(
  target: Define,
  path: Path<LabeledStatement>){

  const body = path.get('body') as Path<Statement>;
  const { name } = path.node.label;

  if(name[0] == "_")
    throw Oops.BadModifierName(path);

  if(body.isExpressionStatement() || RESERVED_BLOCKS.includes(name))
    applyModifier(name, target, body as any);

  else if(body.isBlockStatement() || body.isLabeledStatement()){
    const mod = new DefineElement(target.context, name);
    parse(mod, ParseContent, body);
    target.use(mod);
  }

  else
    throw Oops.BadInputModifier(body, body.type)
}