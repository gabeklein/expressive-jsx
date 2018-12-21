
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

export interface BabelState {
    context: StackFrame;
    opts: any;
}

export interface DoExpressive extends DoExpression {
    meta: ElementInline;
    expressive_visited?: true;
}

export type ElementItem = Attribute | ElementInline | NonComponent | InnerStatement;

export interface ComponentRecipient {
    context: StackFrame
    children: ElementItem[];
}