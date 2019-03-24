import { Expression } from '@babel/types';
import { FlatValue, Path } from 'types';

export abstract class Attribute<T extends Expression = Expression> {

    overriden?: boolean;

    constructor(
        public type: "props" | "style", 
        public name: string | undefined,
        public value: FlatValue | T | undefined, 
        public path?: Path<T>){
    }
};

export class SpreadItem extends Attribute {

    insensitive?: boolean;

    constructor(
        type: "props" | "style", 
        node: FlatValue | Expression | undefined,
        path?: Path<Expression>){
    
        super(type, undefined, node, path);
    }
}

export class Prop extends Attribute {

    synthetic?: boolean;

    constructor(
        name: string, 
        node: FlatValue | Expression | undefined,
        path?: Path<Expression>){
    
        super("props", name, node, path);

        if(node && typeof node !== "object")
            this.synthetic = true
    }
}

export class ExplicitStyle extends Attribute {
    
    priority: number = 1;

    constructor(
        name: string, 
        node: FlatValue | Expression | undefined,
        path?: Path<Expression>){
    
        super("style", name, node, path);
    }
}