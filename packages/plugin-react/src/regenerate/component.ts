import { NodePath } from '@babel/traverse';
import {
  ArrayPattern,
  arrayPattern,
  blockStatement,
  Expression,
  Identifier,
  identifier,
  isIdentifier,
  isPatternLike,
  isRestElement,
  MemberExpression,
  memberExpression,
  numericLiteral,
  ObjectPattern,
  objectProperty,
  PatternLike,
  returnStatement,
  Statement,
  stringLiteral,
} from '@babel/types';
import { ParseErrors } from 'errors';
import { callExpress, declare, objectExpress } from 'generate/syntax';
import { ComponentExpression } from 'handle';
import { StackFrame } from 'parse';
import { ExternalsManager } from 'regenerate';
import { ElementReact } from 'translate';
import { DoExpressive } from 'types';

const Oops = ParseErrors({
  PropsCantHaveDefault: "This argument will always resolve to component props",
  ArgumentNotSupported: "Argument of type {1} not supported here!"
})

export function replaceDoExpression(path: NodePath<DoExpressive>){
  const element = path.node.meta;

  if(!(element instanceof ComponentExpression))
    return;

  const factory = new ElementReact(element);

  if(factory.children.length == 0 && element.exec === undefined){
    path.replaceWith(asOnlyAttributes(factory))
    return;
  }

  const context = element.context as StackFrame;
  const factoryExpression = context.Generator.container(factory);

  // if(meta instanceof ComponentExpression && meta.exec)
  //     incorperateChildParameters(meta, state.context.Imports)

  if(element.exec && element.statements.length){
    const replacement = [
      ...element.statements as Statement[],
      returnStatement(factoryExpression)
    ];

    if(path.parentPath.isReturnStatement())
      path.parentPath.replaceWithMultiple(replacement)
    else
      path.replaceWith(blockStatement(replacement))
  }
  else {
    const prop = path.node.expressive_parent;

    if(prop)
      prop.value = factoryExpression as Expression;
    else
      path.replaceWith(factoryExpression);
  }

  context.Module.lastInsertedElement = path;
}

function asOnlyAttributes(factory: ElementReact){
  const classNames = factory.classList as string[];
  let style: Expression | undefined;

  for(const prop of factory.props)
    if(prop.name == "style")
      style = prop.value || objectExpress()

  return objectExpress({
    className: stringLiteral(
      classNames.join(" ")
    ),
    style: style
  })
}

void function incorperateChildParameters(
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
    let propertyAs: Identifier =
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
    let getKids: Expression = callExpress(inner, props.node);
    if(count == 1)
      getKids = memberExpression(getKids, numericLiteral(0), true)

    const declarator = declare("var", assign, getKids);
    Do.statements.unshift(declarator)
  }
}