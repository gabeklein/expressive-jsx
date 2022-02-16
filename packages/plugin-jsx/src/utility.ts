import type { BunchOf } from 'types';

const m32 = Math.imul;

/**
 * "cyrb53" hashing function, lifted from stack-overflow.
 * Avoids needing to use "crypto" module.
 * 
 * https://stackoverflow.com/a/52171480/877165
 * */
export function hash(str = "", length = 3){
  const x = 0x85ebca6b;
  const y = 0xc2b2ae35;
  let h1 = 0xdeadbeef;
  let h2 = 0x41c6ce57;

  for(let i = 0, ch; i < str.length; i++){
    ch = str.charCodeAt(i);
    h1 = m32(h1 ^ ch, 0x9e3779b1);
    h2 = m32(h2 ^ ch, 0x5f356495);
  }

  h1 = m32(h1 ^ (h1>>>16), x) ^ m32(h2 ^ (h2>>>13), y);
  h2 = m32(h2 ^ (h2>>>16), x) ^ m32(h1 ^ (h1>>>13), y);

  const out = 0x100000000 * (0x1fffff & h2) + (h1>>>0);
  return out.toString(32).substring(0, length);
}

export function ensureArray<T>(a: T | T[]){
  return Array.isArray(a) ? a : [a];
}

export class Stack<T> {
  layer = {} as BunchOf<T>;

  push(){
    return Object.assign(Object.create(this), {
      layer: Object.create(this.layer)
    })
  }

  set(key: string, value: T){
    this.layer[key] = value;
  }

  get(key: string){
    return this.layer[key];
  }

  has(key: string){
    return this.layer.hasOwnProperty(key);
  }
}

export class ArrayStack<T = any, I = T>
  extends Array<T[] | I> {

  top?: T[] | I;

  insert(x: T){
     if(Array.isArray(this.top))
      this.top.push(x)
    else {
      this.top = [x]
      super.push(this.top)
    }
  }

  push(x: I): number {
    this.top = x;
    return super.push(x);
  }
}

/**
 * Put starting value into a queue and then iterate that queue.
 * Each step receives next item in queue, and opportunity to add more.
 * Use `enqueue` callback to push new item to stack for processing.
 * If a step returns, will break the loop and return that value.
*/
export function doUntilEmpty<T, R>(
  startingData: T,
  step: (next: T, enqueue: (...data: T[]) => void) => R | void
): R | undefined {
  let i = 0;
  let queue = [ startingData ];

  do {
    const pending: T[] = [];
    const output = step(queue[i], 
      (...next) => pending.push(...next)  
    );

    if(output !== undefined)
      return output;

    if(!pending.length)
      i++;
    else {
      queue = [ ...pending, ...queue.slice(i+1) ];
      i = 0;
    }
  }
  while(i in queue)
}