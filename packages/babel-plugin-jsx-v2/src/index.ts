import { CONTEXT, Context, DefineContext, FunctionContext, getContext, ModuleContext } from './context';
import { handleElement, isImplicitReturn } from './elements';
import { handleLabel } from './label';
import * as t from './types';

export type Macro = (this: DefineContext, ...args: any[]) => Record<string, any> | void;

export interface Options {
  macros?: Record<string, Macro>[];
  define?: Record<string, DefineContext>[];
  assign?(this: DefineContext, ...args: any[]): void;
  apply?(this: DefineContext, path: t.NodePath<t.JSXElement>): void;
}

type Visitor<T extends t.Node> =
  t.VisitNodeObject<t.PluginPass & { context: Context }, T>;

declare namespace Plugin {
  export { Options }
}
  
const Plugin = (babel: any) => {
  return <t.PluginObj>({
    manipulateOptions(options, parse){
      parse.plugins.push("jsx");
    },
    visitor: {
      Program,
      LabeledStatement,
      JSXElement
    }
  })
}

export default Plugin;

const Program: Visitor<t.Program> = {
  enter(path, state){
    const { macros, define, assign } = state.opts as Options; 

    if(!assign)
      throw new Error(`Plugin has not defined an assign method.`);

    const context = new ModuleContext(path);

    context.macros = Object.assign({}, ...macros || []);
    context.define = Object.assign({}, ...define || []);
    context.assign = assign;
  }
}

const IGNORE = new Set();

const LabeledStatement: Visitor<t.LabeledStatement> = {
  enter(path){
    const body = path.get("body");

    if(body.isFor() || body.isWhile()){
      IGNORE.add(path);
      return;
    }

    let parent = path.parentPath;

    if(parent.isBlockStatement())
      parent = parent.parentPath!;

    let context = CONTEXT.get(parent);

    if(!context){
      if(parent.isFunction())
        context = new FunctionContext(parent);
      else
        throw new Error("Context not found");
    }

    handleLabel(context, path);
  },
  exit(path){
    if(IGNORE.has(path))
      return;

    path.remove();
  }
}

const JSXElement: Visitor<t.JSXElement> = {
  enter(path){
    if(isImplicitReturn(path))
      return;
    
    const context = getContext(path, false);

    if(context instanceof DefineContext)
      handleElement(context, path);
  }
}