import { Define } from 'handle/definition';
import { builtIn } from 'modifier/builtIn';
import { containerName } from 'parse/entry';
import { FileManager } from 'scope';
import * as $ from 'syntax';
import { hash } from 'utility';

import type * as t from 'syntax/types';
import type { BabelState, BunchOf, ModifyAction, Options } from 'types';
import type { Element } from "parse/jsx";

const DEFAULTS: Options = {
  env: "web",
  styleMode: "compile",
  runtime: "@expressive/css",
  pragma: "react",
  output: "js",
  modifiers: []
};

const REGISTER = new WeakMap<t.Node, StackFrame>();
const AMBIENT = new WeakMap<StackFrame, Define>();

export function getContext(
  path: t.Path<any>, create?: boolean): StackFrame {

  while(path = path.parentPath){
    const scope = REGISTER.get(path.node);

    if(scope)
      return scope;

    if(!$.is(path, "BlockStatement") || !create)
      continue;

    const parentContext = getContext(path);

    if(!parentContext)
      throw new Error("well that's awkward.");

    const name = containerName(path);
    const define = new Define(parentContext, name);
    const { context } = define;

    if(path.node)
      REGISTER.set(path.node, context);
  
    context.name = containerName(path);
  
    return context;
  }

  throw new Error("Scope not found!");
}

export class StackFrame {
  name: string;
  filename: string;
  module: any;

  opts: Options;
  program: FileManager;

  modifiersDeclared = new Set<Define>();
  modifiers = {} as BunchOf<Define>;
  handlers = {} as BunchOf<ModifyAction>;

  get parent(){
    return Object.getPrototypeOf(this);
  }

  get ambient(){
    const ambient = AMBIENT.get(this);

    if(ambient)
      return ambient;

    return new Define(this, this.name);
  }

  set ambient(item: Define){
    AMBIENT.set(this, item);
  }

  constructor(
    path: t.Path<t.BabelProgram>,
    state: BabelState){

    const options = { ...DEFAULTS, ...state.opts };

    this.opts = options;
    this.name = hash(state.filename);
    this.filename = state.filename;
    this.module = (state.file as any).opts.configFile;
    this.program = FileManager.create(this, path, options);
  
    REGISTER.set(path.node, this);
    Object.assign(this.handlers, builtIn, ...options.modifiers);
  }

  getHandler(named: string, ignoreOwn = false){
    let context = this as any;

    if(ignoreOwn)
      for(let found; !found;){
        found = context.handlers.has(named);
        context = context.parent;
      }

    const [key, ...path] = named.split(".");
    let handler = this.handlers[key];

    for(const key of path)
      handler = (handler as any)[key];

    return handler;
  }
}

export function applyModifier(
  target: Element, from: string | Define){

  const apply = [] as Define[];
  let modify = typeof from == "string"
    ? target.getModifier(from)
    : from;

  while(modify){
    apply.push(modify);

    for(const use of [modify, ...modify.includes]){
      target.includes.add(use);
      use.targets.add(target);
    }

    const context = modify.context.modifiers;

    Object.getOwnPropertyNames(context).map(name => {
      target.setModifier(name, context[name]);
    })

    if(modify !== modify.then)
      modify = modify.then;
    else
      break;
  }

  return apply;
}