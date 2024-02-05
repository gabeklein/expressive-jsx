import { CONTEXT, Context, DefineContext, FunctionContext, getContext, ModuleContext } from './context';
import { handleElement, isImplicitReturn } from './elements';
import { handleLabel } from './label';
import * as t from './types';

export type Macro = (this: DefineContext, ...args: any[]) => Record<string, any> | void;

export interface Options {
  macros?: Record<string, Macro>[];
  define?: Record<string, DefineContext>[];
}

type Visitor<T extends t.Node> =
  t.VisitNodeObject<t.PluginPass & { context: Context }, T>;

export default (babel: any) => {
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

const Program: Visitor<t.Program> = {
  enter(path, state){
    const { macros, define } = state.opts as Options; 
    const context = new ModuleContext(path);

    context.macros = Object.assign({}, ...macros || []);
    context.define = Object.assign({}, ...define || []);
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
    let context = CONTEXT.get(parent);
    let { name } = path.get("label").node;

    if(!context){
      parent = parent.parentPath!;

      if(parent.isFunction())
        context = new FunctionContext(parent);
      else
        throw new Error("Context not found");
    }

    handleLabel(context, name, body);
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

    if(context)
      handleElement(context, path);
  }
}