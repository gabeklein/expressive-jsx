import { getName } from 'parse/entry';
import * as t from 'syntax';

import { Context } from './context';

export class Define extends Context {
  uid: string;

  within?: Define;
  container?: Define;

  styles = {} as Record<string, string>;
  props = {} as Record<string, string>;
  
  priority = 1;

  /** Modifiers based upon this one. */
  dependant = new Set<Define>();

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

  static get(path: t.Path<t.Node>){
    do {
      if(path.data){
        const { context } = path.data;
  
        if(context instanceof Define)
          return context;
      }
      else if(path.isFunction()){
        const parent = Context.get(path.parentPath);
        const context = new Define(parent, getName(path));

        path.data = { context };

        return context;
      }
    }
    while(path = path.parentPath!);

    throw new Error("No context found.");
  }
}