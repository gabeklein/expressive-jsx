import { PluginObj, PluginPass } from '@babel/core';
import { NodePath } from '@babel/traverse';

import { Context } from './context/Context';
import { createContext, handleLabel } from './label';
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
      LabeledStatement: {
        enter(path){
          const body = path.get("body");
      
          if(body.isFor() || body.isWhile())
            return;
      
          handleLabel(path);
          onExit(path, () => {
            if(!path.removed)
              path.remove();
          });
        },
        exit(path){
          exit(path);
      
          for(const p of path.getAncestry()){
            if(p.isLabeledStatement())
              break;
      
            if(!exit(p))
              break;
          }
        }
      },
      BlockStatement: { exit },
      JSXElement: {
        enter(path){
          if(fixImplicitReturn(path))
            return;

          const parent = path.parentPath;
          const using = new Set<Context>()
          const scope = new Set<Context>(
            parent.isJSXElement()
              ? SCOPE.get(parent)
              : [createContext(parent)]
          );

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
        },
        exit(path){
          const [ parent ] = SCOPE.get(path)!;
      
          if(parent.define.this !== parent
          || parent.props.size === 0
          || parent.usedBy.size)
            return;
      
          const [ inserted ] = path.replaceWith(
            t.jsxElement(
              t.jsxOpeningElement(t.jSXIdentifier("this"), []),
              t.jsxClosingElement(t.jSXIdentifier("this")),
              [path.node]
            )
          )
      
          apply(inserted, [parent]);
          inserted.skip();
        }
      }
    }
  }
}

export default Plugin;

type ExitCallback = (path: NodePath, key: string | number | null) => void;

export function onExit(path: NodePath, callback: ExitCallback){
  HANDLED.set(path, callback);
}

export function exit(path: NodePath){
  const callback = HANDLED.get(path);

  if(callback){
    callback(path, path.key);
    // HANDLED.delete(path);
    return true;
  }

  if(path.isBlockStatement())
    return exit(path.parentPath!);

  return false;
}