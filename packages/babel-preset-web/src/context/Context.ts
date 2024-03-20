import { NodePath } from '@babel/traverse';

import { simpleHash } from '../helper/simpleHash';
import { Macro, Options } from '../options';
import { Define } from './Define';

const CONTEXT = new WeakMap<NodePath, Context>();

export class Context {
  parent: Context | undefined;
  define: Record<string, Define> = {};
  macros: Record<string, Macro> = {};
  options: Options;
  uid = "";

  static get(from: NodePath){
    return CONTEXT.get(from)
  }

  constructor(
    input: Context | Options,
    public path: NodePath){

    CONTEXT.set(path, this);

    if(input instanceof Context){
      this.define = Object.create(input.define);
      this.macros = Object.create(input.macros);
      this.options = input.options;
      this.parent = input;
      this.uid = simpleHash(input?.uid);
    }
    else if(path.isProgram()) {
      const name = (path.hub as any).file.opts.filename as string;
      
      if(!input.apply)
        throw new Error(`Plugin has not defined an apply method.`);

      if(input.polyfill === undefined)
        input.polyfill = require.resolve("../polyfill");

      this.define = Object.assign({}, ...input.define || []);
      this.macros = Object.assign({}, ...input.macros || []);
      this.options = input;
      this.uid = simpleHash(name);
    }
    else
      throw new Error("Invalid context input.");
  }
  
  get(name: string){
    const applicable = [] as Define[];
    let { define } = this;
    let mod: Define;

    while(mod = define[name]){
      applicable.push(mod, ...mod.also);

      if(name == "this")
        break;

      define = Object.getPrototypeOf(define);
    }

    return applicable.reverse();
  }
}