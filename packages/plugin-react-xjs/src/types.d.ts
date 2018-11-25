
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

export * from "@babel/types";
export {
    Scope,
    NodePath as Path
} from "@babel/traverse";

export type ArrayItem = Expression | SpreadElement;

export interface BunchOf<T> {
    [key: string]: T
}

export interface ElementSyntax {
    product: Expression,
    factory?: Statement[]
}

export interface ElementInlcusion {
    inlineType: string
    transform?: () => ElementSyntax
}

export interface ExpressiveElementChild extends ElementInlcusion {
    precedence?: number;
}

export interface XReactTag {
    head?: true;
    name: string;
    path?: Path<Identifier>
}

export interface ComponentRecipient {
    context: StackFrame
    children: ElementInlcusion[];

}