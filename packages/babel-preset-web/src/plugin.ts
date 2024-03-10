import { CONTEXT, Context, DefineContext, ModuleContext } from './context';
import { ElementContext } from './elements';
import { createContext, handleLabel } from './label';
import { Macro, Options } from './options';
import * as t from './types';

type Visitor<T extends t.Node> =
  t.VisitNodeObject<t.PluginPass & { context: Context }, T>;

declare namespace Plugin {
  export { Options };
  export { Macro };
  export { DefineContext }
}

function Plugin(){
  return <t.PluginObj>({
    manipulateOptions(_options, parse){
      parse.plugins.push("jsx");
    },
    visitor: {
      Program,
      LabeledStatement,
      BlockStatement,
      JSXElement
    }
  })
}

export default Plugin;

const Program: Visitor<t.Program> = {
  enter(path, state){
    new ModuleContext(path, state);
  }
}

const BlockStatement: Visitor<t.BlockStatement> = {
  exit(path){
    const parent = path.parentPath!;
    const callback = HANDLED.get(parent);
  
    if(callback)
      callback(path.key, parent);
  }
}

const HANDLED = new WeakMap<t.NodePath, (key: unknown, path: t.NodePath) => void>();

const LabeledStatement: Visitor<t.LabeledStatement> = {
  enter(path){
    const body = path.get("body");

    if(body.isFor() || body.isWhile())
      return;

    handleLabel(path);
    HANDLED.set(path, () => {
      !path.removed && path.remove();
    });
  },
  exit(path){
    const callback = HANDLED.get(path);
  
    if(callback)
      callback(path.key, path);

    for(let p of path.getAncestry()){
      if(p.isLabeledStatement())
        break;

      if(p.isBlockStatement())
        p = p.parentPath!;

      const callback = HANDLED.get(p);
  
      if(!callback)
        break;

      callback(p.key, p);
    }
  }
}

const JSXElement: Visitor<t.JSXElement> = {
  enter(path){
    const parent = createContext(path, false);
    new ElementContext(parent, path);
  },
  exit(path, { opts }){
    const { apply } = opts as Options;
    const element = CONTEXT.get(path) as ElementContext;

    if(apply)
      apply(element);

    const [{ node }, statement, block, within] = path.getAncestry();

    if(!block.isBlockStatement())
      return;
  
    const inserted = block.get("body").length === 1 &&
      within.isArrowFunctionExpression()
      ? block.replaceWith(t.parenthesizedExpression(node))
      : statement.replaceWith(t.returns(node));
  
    inserted[0].skip();
  }
}

export function onExit(
  path: t.NodePath, callback: (key: unknown, path: t.NodePath) => void){

  HANDLED.set(path, callback);
}