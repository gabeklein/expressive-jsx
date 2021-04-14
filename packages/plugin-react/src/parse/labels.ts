import { ParseErrors } from 'errors';
import { DefineElement } from 'handle';
import { applyDirective } from 'modifier/apply';
import { parse } from 'parse';

import type { NodePath as Path } from "@babel/traverse";
import type { LabeledStatement, Statement } from "@babel/types";
import type { Define } from "handle";

const Oops = ParseErrors({
  BadInputModifier: "Modifier input of type {1} not supported here!",
  BadModifierName: "Modifier name cannot start with _ symbol!",
});

const LeadingDollarSign = /^\$[a-z]\w*/;

export function parseDefineBlock(
  target: Define,
  path: Path<LabeledStatement>){

  const body = path.get('body') as Path<Statement>;
  const { name } = path.node.label;

  if(name[0] == "_")
    throw Oops.BadModifierName(path);

  if(body.isExpressionStatement() || LeadingDollarSign.test(name))
    applyDirective(name, target, body as any);

  else if(body.isBlockStatement() || body.isLabeledStatement()){
    const mod = new DefineElement(target.context, name);
    parse(mod, body);
    target.provide(mod);
  }

  else
    throw Oops.BadInputModifier(body, body.type)
}