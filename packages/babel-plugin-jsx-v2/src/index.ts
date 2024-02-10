import { CONTEXT, Context, DefineContext, FunctionContext, getContext, ModuleContext } from './context';
import { AbstractJSX } from './elements';
import { handleLabel } from './label';
import { Macro, Options } from './options';
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
      JSXElement
    }
  })
}

export default Plugin;

const Program: Visitor<t.Program> = {
  enter(path, state){
    const options = state.opts as Options;
    const { macros, define, assign } = options; 

    Object.assign(Options, options);

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
    const context = getContext(path, false);

    if(!(context instanceof DefineContext))
      return;
    
    const element = new AbstractJSX(path, context);
    let tag = path.node.openingElement.name;

    while(t.isJSXMemberExpression(tag)){
      element.use(tag.property.name);
      tag = tag.object;
    }

    if(t.isJSXIdentifier(tag))
      element.use(tag.name);
  },
  exit(path){
    const statement = path.parentPath;
    const block = statement.parentPath as t.NodePath<t.BlockStatement>;
    const within = block.parentPath as t.NodePath;

    const inserted = block.node.body.length === 1 && within.isArrowFunctionExpression()
      ? block.replaceWith(t.parenthesizedExpression(path.node))
      : statement.replaceWith(t.returns(path.node));

    inserted[0].skip();
  }
}