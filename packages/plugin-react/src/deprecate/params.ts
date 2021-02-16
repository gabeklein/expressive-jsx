import {
  arrayPattern,
  identifier,
  isIdentifier,
  isPatternLike,
  isRestElement,
  memberExpression,
  numericLiteral,
  objectProperty,
} from '@babel/types';
import { ParseErrors } from 'errors';
import { _call, _declare } from 'syntax';

import type {
  ArrayPattern,
  Expression,
  Identifier,
  MemberExpression,
  ObjectPattern,
  PatternLike
} from '@babel/types';
import type { ComponentExpression } from 'handle/entry';
import type { ExternalsManager } from 'regenerate/scope';

const Oops = ParseErrors({
  PropsCantHaveDefault: "This argument will always resolve to component props",
  ArgumentNotSupported: "Argument of type {1} not supported here!"
})

export function incorperateChildParameters(
  Do: ComponentExpression,
  Imports: ExternalsManager
){
  const wrapperFunction = Do.exec;
  let assign: Identifier | ArrayPattern | ObjectPattern
  let init: Identifier | MemberExpression | undefined;

  if(wrapperFunction === undefined) return;

  const params = wrapperFunction.get("params") as any;
  if(params.length < 2) return;

  const props = params[0];
  const arrowFn = wrapperFunction.node;
  const children = params.slice(1);
  const first = children[0].node;
  let count = children.length;

  if(props.isAssignmentPattern()){
    const assignedValue = props.get("right");
    throw Oops.PropsCantHaveDefault(assignedValue);
  }

  if(isRestElement(first)){
    assign = first.argument as typeof assign;
    count += 1;
  }
  else {
    const destructure = [] as PatternLike[];
    for(const child of children){
      if(isPatternLike(child.node))
        destructure.push(child.node)
      else
        throw Oops.ArgumentNotSupported(child, child.type)
    }
    assign = count > 1
      ? arrayPattern(destructure)
      : destructure[0] as Identifier;
  }

  if(props.isIdentifier())
    init = memberExpression(props.node, identifier("children"));

  else if(props.isObjectPattern()){
    const propertyAs: Identifier =
      isIdentifier(assign) ? assign :
        init = wrapperFunction.scope.generateUidIdentifier("children") as any;

    props.node.properties.push(
      objectProperty(
        identifier("children"),
        propertyAs
      )
    )
  }

  arrowFn.params = [props.node as Identifier | ObjectPattern];

  if(init){
    const inner = Imports.ensure("$runtime", "body");
    let getKids: Expression = _call(inner, props.node);

    if(count == 1)
      getKids = memberExpression(getKids, numericLiteral(0), true);

    Do.statements.unshift(
      _declare("var", assign, getKids)
    )
  }
}