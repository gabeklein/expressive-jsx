import { getName } from 'parse/entry';
import * as t from 'syntax';

import { Context } from './context';
import { applyModifier } from './jsx';

export class DefineContext extends Context {
  uid: string;

  within?: DefineContext;
  container?: DefineContext;

  styles = {} as Record<string, string>;
  props = {} as Record<string, string>;
  
  priority = 1;

  /** Modifiers based upon this one. */
  dependant = new Set<DefineContext>();

  get isUsed(){
    return Object.keys(this.styles).length > 0;
  }

  get selector(){
    return [ `.${this.uid}` ];
  }

  constructor(
    parent: Context,
    name: string){

    super(parent, name);
    this.uid = name + "_" + this.path();
    this.using.this = this;

    if(name)
      parent.using[name] = this;
  }

  static apply(path: t.Path<t.JSXElement>){
    applyModifier(this.get(path), path);
  }

  static get(path: t.Path<t.Node>){
    do {
      if(path.data){
        const { context } = path.data;
  
        if(context instanceof DefineContext)
          return context;
      }
      else if(path.isFunction()){
        const parent = Context.get(path.parentPath);
        const context = new DefineContext(parent, getName(path));

        path.data = { context };

        return context;
      }
    }
    while(path = path.parentPath!);

    throw new Error("No context found.");
  }
}