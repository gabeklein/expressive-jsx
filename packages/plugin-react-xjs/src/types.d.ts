import { NodePath as Path } from '@babel/traverse';
import { DoExpression, Expression, SpreadElement, Statement } from '@babel/types';

import { Attribute, ElementInline, InnerStatement, NonComponent, StackFrame } from './internal';

export { NodePath as Path, Scope } from "@babel/traverse";

export type ListElement = Expression | SpreadElement;
export type ElementItem = Attribute | ElementInline | NonComponent<any> | InnerStatement<any>;

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

export interface ComponentRecipient {
    context: StackFrame
    children: ElementItem[];
}