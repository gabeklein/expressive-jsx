
import { StackFrame } from "./scope";
import { NodePath as Path } from "@babel/traverse";
import { 
    Expression, 
    Identifier, 
    SpreadElement, 
    Statement, 
    ExpressionStatement, 
    Program, 
    DoExpression,
} from "@babel/types";

import { Attribute, NonComponent, ElementInline } from "./internal";
import { InnerStatement } from "./item";

// export * from "@babel/types";
export {
    Scope,
    NodePath as Path
} from "@babel/traverse";

export type ListElement = Expression | SpreadElement;

export interface BunchOf<T> {
    [key: string]: T
}

export interface ElementSyntax {
    product: Expression,
    factory?: Statement[]
}

export type ElementItem = Attribute | ElementInline | NonComponent | InnerStatement;

export interface XReactTag {
    head?: true;
    name: string;
    path?: Path<Identifier>
}

export interface ComponentRecipient {
    context: StackFrame
    children: ElementItem[];

}