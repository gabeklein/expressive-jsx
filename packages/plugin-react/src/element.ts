import { Attribute, ExplicitStyle, InnerStatement, NonComponent, Prop, SpreadItem, ElementInline } from '@expressive/babel-plugin-core';
import { Statement, Expression } from '@babel/types';

export type SequenceItem = Element | Prop | ExplicitStyle | SpreadItem;
export type Element = ElementInline | NonComponent<any>;
export type GenerateStatement = InnerStatement<any>;

export type Syntax = [ Expression, Statement[]?];

export class ArrayStack<Type = any, Insert = never>
    extends Array<Type[] | Insert> {

    top?: Type[] | Insert;

    insert(x: Type){
       if(Array.isArray(this.top))
            this.top.push(x)
        else {
            this.top = [x]
            super.push(this.top)
        }
    }

    push(x: Insert): number {
        this.top = x;
        return super.push(x);
    }
}

export class AttributeStack<Type extends Attribute> 
    extends ArrayStack<Type, SpreadItem> {

    static = [] as Type[];
    doesReoccur?: true;

    constructor(previous?: AttributeStack<Type>){
        super();
        if(previous)
            previous.doesReoccur = true;
    }

    insert(item: Type | SpreadItem): boolean {
        if(item instanceof SpreadItem){
            this.top = item
            this.push(item);
            if(item.orderInsensitive)
                return true;
        }
        else 
        if(item.value && this.length < 2 
        || (<SpreadItem>this.top).orderInsensitive){
            this.static.push(item);
            return true;
        }
        else
            super.insert(item);

        return false;
    }
}
