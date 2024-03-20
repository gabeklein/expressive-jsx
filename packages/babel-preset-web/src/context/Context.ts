import { NodePath } from '@babel/traverse';

import { simpleHash } from '../helper/simpleHash';
import { Macro, Options } from '../options';
import { Define } from './Define';

const CONTEXT = new WeakMap<NodePath, Context>();

export class Context {
  parent: Context | undefined;
  define: Record<string, Define> = {};
  macros: Record<string, Macro> = {};
  uid = "";

  static get(from: NodePath){
    return CONTEXT.get(from)
  }

  constructor(
    public path: NodePath,
    input?: Context){

    CONTEXT.set(path, this);

    if(input instanceof Context){
      this.parent = input;
      this.define = Object.create(input.define);
      this.macros = Object.create(input.macros);
      this.uid = simpleHash(input?.uid);
    }
    else if(!path.isProgram())
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