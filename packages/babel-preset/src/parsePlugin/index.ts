import { PluginObj, PluginPass } from '@babel/core';
import { NodePath } from '@babel/traverse';

import { hash } from '../helper/util';
import t from '../types';
import { Context } from './context';
import { getContext, handleLabel } from './label';
import { getNames } from './names';
import { Macro, Options } from './options';

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
const USING_KEY = Symbol("expressive context");

export { Context, Options, Macro }

export function getUsing(path: NodePath){
  return new Set(path.getData(USING_KEY)) as Set<Context>;
}

function Plugin(_compiler: any, options: Options): PluginObj<State> {
  const SCOPE = new WeakMap<NodePath, Set<Context>>();
  
  return {
    manipulateOptions(_options, parse){
      parse.plugins.push("jsx");
    },
    visitor: {
      Program(path, state){
        const context = new Context(path);

        context.uid = hash(state.filename!);
        context.define = Object.assign({}, ...options.define || []);
        context.macros = Object.assign({}, ...options.macros || []);
      },
      JSXElement(path){
        if(path.getData(USING_KEY))
          return;

        let { node, parentPath: parent } = path;

        if(parent.isExpressionStatement()){
          const block = parent.parentPath;

          if(block.isBlockStatement()
          && block.get("body").length == 1
          && block.parentPath.isArrowFunctionExpression())
            block.replaceWith(t.parenthesizedExpression(node));
          else
            parent.replaceWith(t.returnStatement(node));
        
          path.skip();
          return;
        }

        const context = !parent.isJSXElement() && getContext(parent);
        const scope = new Set(context ? [context] : SCOPE.get(parent));
        const using = new Set<Context>();

        SCOPE.set(path, scope);

        getNames(path).forEach((attr, name) => {
          let used = false;
    
          for(let { define } of scope){
            const apply = [] as Context[];

            for(
              let mod: Context; 
              mod = define[name];
              define = Object.getPrototypeOf(define)){
  
              apply.push(mod, ...mod.also);
              used = true;
        
              if(name == "this")
                break;
            }

            apply.reverse().forEach((ctx) => {
              ctx.usedBy.add(path);
              scope.add(ctx);
              using.add(ctx);
            });
          }
    
          if(used && attr.isJSXAttribute())
            attr.remove();
        });
    
        path.setData(USING_KEY, using)

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
    
        inserted.setData(USING_KEY, new Set([context]));
      },
      BlockStatement: {
        exit
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
        exit
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