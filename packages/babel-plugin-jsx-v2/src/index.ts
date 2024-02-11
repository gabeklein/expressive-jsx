import { Context, ModuleContext } from './context';
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
      JSXElement
    }
  })
}

export default Plugin;

const Program: Visitor<t.Program> = {
  enter(path, state){
    const options = state.opts as Options;

    Object.assign(Options, options);
    new ModuleContext(path, options);
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

    handleLabel(path);
  },
  exit(path){
    if(IGNORE.has(path))
      return;

    path.remove();
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