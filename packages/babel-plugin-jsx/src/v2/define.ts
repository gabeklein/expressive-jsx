import { Context } from './context';

export class Define {
  name?: string;

  within?: Define;
  container?: Define;

  styles = {} as Record<string, string>;
  props = {} as Record<string, string>;
  
  priority = 1;

  /** Modifiers based upon this one. */
  dependant = new Set<Define>();

  uid: string;

  context: Context;

  get isUsed(){
    return Object.keys(this.styles).length > 0;
  }

  get selector(){
    return [ `.${this.uid}` ];
  }

  constructor(
    context: Context,
    name = context.name){

    context.file.declared.add(this);

    this.name = name;
    this.context = context;
    this.uid = name + "_" + context.path();
  }
}