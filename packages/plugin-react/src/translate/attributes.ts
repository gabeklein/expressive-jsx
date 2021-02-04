import { ExplicitStyle, Prop } from "handle";

export class ArrayStack<Type = any, Interrupt = Type>
  extends Array<Type[] | Interrupt> {

  top?: Type[] | Interrupt;

  insert(x: Type){
     if(Array.isArray(this.top))
      this.top.push(x)
    else {
      this.top = [x]
      super.push(this.top)
    }
  }

  push(x: Interrupt): number {
    this.top = x;
    return super.push(x);
  }
}

export class AttributeStack<Type extends ExplicitStyle | Prop>
  extends ArrayStack<Type> {

  invariant = [] as Type[];

  insert(
    item: Type): boolean {

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
