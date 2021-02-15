import type { Attribute } from 'handle';

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

export class AttributeStack<Type extends Attribute>
  extends ArrayStack<Type> {

  invariant = [] as Type[];

  insert(item: Type): boolean {
    if(item.name === undefined){
      this.top = item
      this.push(item);
    }
    else
    if(item.invariant && this.length < 2){
      // this.invariant.push(item);
      return true;
    }
    else
      super.insert(item);

    return false;
  }
}
