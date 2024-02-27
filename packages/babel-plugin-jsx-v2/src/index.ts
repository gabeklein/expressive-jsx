import { CONTEXT, Context, DefineContext } from './context';
import { handleElement } from './elements';
import { handleLabel } from './label';
import { Macro, Options } from './options';
import { fixImplicitReturn } from './syntax/element';
import * as t from './types';

type Visitor<T extends t.Node> =
  t.VisitNodeObject<t.PluginPass & { context: Context }, T>;

declare namespace Plugin {
  export { Options };
  export { Macro };
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
    const { macros, define, apply, assign } = options; 
    const name = (path.hub as any).file.opts.filename as string;
    const context = new Context();

    Object.assign(Options, options);
    Object.defineProperty(context, "uid", { value: name });

    if(!assign)
      throw new Error(`Plugin has not defined an assign method.`);

    context.assignTo(path);
    context.assign = assign;
    context.apply = apply;
    context.macros = Object.assign({}, ...macros || []);
    context.define = Object.assign({}, ...define || []);
  }
}

const BlockStatement: Visitor<t.BlockStatement> = {
  exit: exitParent
}

const HANDLED = new WeakSet<t.NodePath>();

const LabeledStatement: Visitor<t.LabeledStatement> = {
  enter(path){
    const body = path.get("body");

    if(body.isFor() || body.isWhile())
      return;

    handleLabel(path);
    HANDLED.add(path);
  },
  exit(path){
    if(HANDLED.has(path))
      path.remove();

    exitParent(path);
  }
}

const JSXElement: Visitor<t.JSXElement> = {
  enter(path){
    handleElement(path);
  },
  exit(path){
    fixImplicitReturn(path);
  }
}

function exitParent(path: t.NodePath){
  const parent = path.parentPath!;
  const context = CONTEXT.get(parent);

  if(context instanceof DefineContext && context.exit)
    context.exit(parent.key);
}