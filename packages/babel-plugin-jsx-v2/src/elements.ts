import { DefineContext, FunctionContext } from './context';
import * as t from './types';
import { HTML_TAGS, SVG_TAGS } from './types/tags';

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
    
  for(const def of define){
    if(def instanceof FunctionContext)
      forwardProps(def.path, path);
  }
}

function setTagName(
  element: t.NodePath<t.JSXElement> | t.JSXElement,
  tagName: string){

  if(element instanceof t.NodePath)
    element = element.node;

  const { openingElement, closingElement } = element;
  const tag = t.jsxIdentifier(tagName);

  openingElement.name = tag;

  if(closingElement)
    closingElement.name = tag;
}

function generateUidIdentifier(scope: t.Scope, name = "temp") {
  name = name.replace(/[0-9]+$/g, "");
  let uid = name;
  let i = 0;
  do {
    if(i > 0)
      uid = name + i;

    i++;
  } while (
    scope.hasLabel(uid) ||
    scope.hasBinding(uid) ||
    scope.hasGlobal(uid) ||
    scope.hasReference(uid)
  );
  const program = scope.getProgramParent();
  program.references[uid] = true;
  program.uids[uid] = true;
  return t.identifier(uid);
}

function forwardProps(
  parent: t.NodePath<t.Function>,
  jsxElement: t.NodePath<t.JSXElement>){

  let [ _props ] = parent.node.params;

  if(!_props){
    _props = generateUidIdentifier(jsxElement.scope, "props");
    parent.node.params.unshift(_props);
  }
  else if(t.isObjectPattern(_props)){
    const props = _props;
    _props = generateUidIdentifier(jsxElement.scope, "rest");
    props.properties.push(t.restElement(_props));
  }

  if(t.isIdentifier(_props))
    jsxElement.node.openingElement.attributes.push(
      t.jsxSpreadAttribute(_props)
    );
}

/*
  TODO: Replace with modifiers for all
  real tags which sets tagName explicitly
*/
function hasProperTagName(element: t.NodePath<t.JSXElement>){
  const tag = element.node.openingElement.name;

  if(!t.isJSXIdentifier(tag))
    return true;

  const { name } = tag;

  if(HTML_TAGS.includes(name))
    return true;

  if(SVG_TAGS.includes(name)){
    let parent: t.NodePath | null = element;
      
    while(parent = parent.parentPath){
      if(parent.isFunction())
        break;

      if(parent.isJSXElement() && t.isJSXIdentifier(parent.node.openingElement.name, { name: "svg" }))
        return true;
    }
  }

  return false;
}