import { DefineContext, FunctionContext } from './context';
import { forwardProps, hasProperTagName, setTagName } from './syntax/element';
import * as t from './types';

export function isImplicitReturn(
  path: t.NodePath<t.JSXElement> | t.NodePath<t.JSXFragment>){

  const statement = path.parentPath;
  const block = statement.parentPath as t.NodePath<t.BlockStatement>;
  const within = block.parentPath as t.NodePath;

  if(!statement.isExpressionStatement() || !within.isFunction())
    return false;

  statement.replaceWith(t.returns(path.node));
  path.skip();

  return true;
}

export function handleElement(
  context: DefineContext,
  path: t.NodePath<t.JSXElement>){

  const attrs = path.get("openingElement").get("attributes");
  const define = new Set<DefineContext>();
  const using = (name: string) => {
    const apply = context.get(name);
    apply.forEach(x => define.add(x));
    return apply.length > 0;
  }
  
  let tag = path.node.openingElement.name;

  while(t.isJSXMemberExpression(tag)){
    using(tag.property.name);
    tag = tag.object;
  }

  if(t.isJSXIdentifier(tag))
    using(tag.name);

  if(!hasProperTagName(path))
    setTagName(path, "div");

  for(const attr of attrs){
    if(attr.isJSXSpreadAttribute())
      continue;

    let {
      name: { name },
      value
    } = attr.node as t.JSXAttribute;

    if(value)
      continue;
  
    if(typeof name !== "string")
      name = name.name;
    
    if(using(name))
      attr.remove();
  }

  applyModifiers(path, define);
}

function applyModifiers(
  path: t.NodePath<t.JSXElement>,
  define: Set<DefineContext>){

  let forward: t.NodePath<t.Function> | undefined;
  const classNames: t.Expression[] = [];
    
  for(const def of define){
    if(def instanceof FunctionContext)
      forward = def.path;

    classNames.push(def.className);
  }

  if(forward)
    forwardProps(forward, path);
}