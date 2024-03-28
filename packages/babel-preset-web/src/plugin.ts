import { PluginObj, PluginPass } from '@babel/core';
import { NodePath } from '@babel/traverse';

import { Context } from './context';
import { getContext, handleLabel } from './label';
import { Macro, Options } from './options';
import { fixImplicitReturn, getNames } from './syntax/jsx';
import t from './types';

export type State = PluginPass & {
  context: Context;
  opts: Options;
}

declare namespace Plugin {
  export {
    Context,
    Macro,
    Options,
  };
}

const HANDLED = new WeakMap<NodePath, ExitCallback>();

function Plugin(_compiler: any, options: Options): PluginObj<State> {
  const SCOPE = new WeakMap<NodePath, Set<Context>>();
  const { apply } = options;

  if(!apply)
    throw new Error(`Plugin has not defined an apply method.`);
  
  return {
    manipulateOptions(_options, parse){
      parse.plugins.push("jsx");
    },
    visitor: {
      Program(path, state){
        new Context(path, state);
      },
      BlockStatement: {
        exit
      },
      LabeledStatement: {
        exit,
        enter(path){
          const body = path.get("body");
      
          if(body.isFor() || body.isWhile())
            return;
      
          handleLabel(path);
          onExit(path, () => {
            if(!path.removed)
              path.remove();
          });
        }
      },
      JSXElement(path){
        if(path.getData("handled"))
          return;

        if(fixImplicitReturn(path))
          return;

        const parent = path.parentPath;
        const context = !parent.isJSXElement() && getContext(parent);
        const scope = new Set(context ? [context] : SCOPE.get(parent));
        const using = new Set<Context>();

        SCOPE.set(path, scope);

        getNames(path).forEach((path, name) => {
          let used = false;
    
          for(const context of scope)
            context.get(name).forEach((ctx) => {
              ctx.usedBy.add(path);
              scope.add(ctx);
              using.add(ctx);
              used = true;
            });
    
          if(used && path.isJSXAttribute())
            path.remove();
        });
    
        apply(path, using);

        if(context === false
        || context.define.this !== context
        || context.props.size === 0
        || context.usedBy.size)
          return;
    
        const [inserted] = path.replaceWith(
          t.jsxElement(
            t.jsxOpeningElement(t.jSXIdentifier("this"), []),
            t.jsxClosingElement(t.jSXIdentifier("this")),
            [path.node]
          )
        )
    
        apply(inserted, [context]);
        inserted.setData("handled", true);
      }
    }
  }
}

export default Plugin;

type ExitCallback = (path: NodePath, key: string | number | null) => void;

export function onExit(path: NodePath, callback: ExitCallback){
  HANDLED.set(path, callback);
}

function exit(path: NodePath){
  for(const p of path.getAncestry()){
    if(p.isBlockStatement())
      continue;

    const callback = HANDLED.get(p);

    if(callback)
      callback(p, p.key);
    else
      break;
  }
}