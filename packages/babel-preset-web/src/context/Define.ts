import { NodePath } from '@babel/traverse';
import { Expression } from '@babel/types';

import { simpleHash } from '../helper/simpleHash';
import { Context } from './Context';
import { Element } from './Element';

export class Define extends Context {
  also = new Set<Define>();
  styles: Record<string, string | unknown[]> = {};
  usedBy = new Set<Element>();
  dependant = new Set<Define>();
  selector: string;

  constructor(
    public name: string,
    public parent: Context,
    public path: NodePath) {

    super(parent, path);

    this.uid = name + "_" + simpleHash(parent?.uid);
    this.selector = `.${this.uid}`;

    for (let x = this.parent; x; x = x.parent!)
      if (x.has)
        x.has(this);
  }

  get empty() {
    return Object.keys(this.styles).length === 0;
  }

  get className(): Expression | string | undefined {
    return this.uid;
  }

  macro(name: string, args: any[]) {
    const queue = [{ name, args }];

    while (queue.length) {
      const { name, args } = queue.pop()!;
      const macro = this.macros[name];
      const apply = (args: any) => {
        this.styles[name] = args;
      };

      if (!macro) {
        apply(args);
        continue;
      }

      const output = macro.apply(this, args);

      if (!output)
        continue;

      if (Array.isArray(output)) {
        apply(output);
        continue;
      }

      if (typeof output != "object")
        throw new Error("Invalid modifier output.");

      for (const key in output) {
        let args = output[key];

        if (args === undefined)
          continue;

        if (!Array.isArray(args))
          args = [args];

        if (key === name)
          apply(args);

        else
          queue.push({ name: key, args });
      }
    }
  }
}
