import { DefineContext, FunctionContext } from './context';
import { setClassNames } from './syntax/className';
import { forwardProps, hasProperTagName, setTagName } from './syntax/element';
import { uniqueIdentifier } from './syntax/unique';
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

  const classNames: t.Expression[] = [];
  let forward: t.NodePath<t.Function> | undefined;
    
  for(const def of define){
    if(def instanceof FunctionContext)
      forward = def.path;

    classNames.push(def.className);
  }

  if(forward){
    const props = forwardProps(forward, path);

    if(classNames.length)
      if(t.isIdentifier(props))
        classNames.unshift(
          t.memberExpression(props, t.identifier("className"))
        );
      else if(t.isObjectPattern(props)){
        let className = props.properties.find(x => (
          t.isObjectProperty(x) &&
          t.isIdentifier(x.key, { name: "className" })
        )) as t.ObjectProperty | undefined;

        if(!className){
          const id = uniqueIdentifier(path.scope, "className");

          className = id.name === "className"
            ? t.objectProperty(id, id, false, true)
            : t.objectProperty(t.identifier("className"), id);
          
          props.properties.unshift(className);
        }
        
        classNames.unshift(className.value as t.Expression);
      }
  }

  if(classNames.length > 0)
    setClassNames(path, classNames);  
}