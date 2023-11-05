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

export function pascalToDash(x: string){
  return x.replace(/([A-Z]+)/g, "-$1").toLowerCase();
}