import { CONTEXT, Context, DefineContext } from './context';
import { ElementContext } from './elements';
import { handleLabel } from './label';
import { Macro, Options } from './options';
import { fixImplicitReturn } from './syntax/element';
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
    const options = state.opts as Options;
    const { macros, define, apply } = options; 
    const name = (path.hub as any).file.opts.filename as string;
    const context = new Context(path);

    if(!apply)
      throw new Error(`Plugin has not defined an apply method.`);

    Object.assign(Options, options);
    Object.defineProperty(context, "uid", { value: name });

    context.macros = Object.assign({}, ...macros || []);
    context.define = Object.assign({}, ...define || []);
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
    new ElementContext(path);
  },
  exit(path, { opts }){
    const { apply } = opts as Options;
    const element = CONTEXT.get(path) as ElementContext;

    if(apply)
      apply(element);

    fixImplicitReturn(path);
  }
}

export function onExit(
  path: t.NodePath, callback: (key: unknown, path: t.NodePath) => void){

  HANDLED.set(path, callback);
}