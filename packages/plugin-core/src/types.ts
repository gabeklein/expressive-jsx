import { NodePath, VisitNodeObject } from '@babel/traverse';
import { DoExpression, Expression, SpreadElement, Statement } from '@babel/types';
import { StackFrame, ElementModifier, ElementInline, ModifyDelegate, Attribute } from 'internal';

export interface Path<T = any> extends NodePath<T> {}
export interface BabelVisitor<T> extends VisitNodeObject<T> {}

export interface DoExpressive extends DoExpression {
    meta: ElementInline;
    expressive_visited?: true;
}

export type ListElement = Expression | SpreadElement;
export type ElementItem = Attribute | ElementInline | NodePath<Expression | Statement>;

export type FlatValue = string | number | boolean | null;

export interface BunchOf<T> {
    [key: string]: T
}

export interface SharedSingleton {
    stack: any
    opts?: any
    state: {
        expressive_for_used?: true;
    }
    styledApplicationComponentName?: string
}

export interface Options {
    compact_vars?: true;
    env: "native" | "web";
    output: "js" | "jsx";
    styleMode: "compile";
    formatStyles: any;
}

export interface ElementSyntax {
    product: Expression,
    factory?: Statement[]
}

export interface ComponentRecipient {
    context: StackFrame
    children: ElementItem[];
}

export type ModifyAction = (this: ModifyDelegate, ...args: any[]) => ModifierOutput | undefined;

export interface ModifierOutput {
    attrs?: BunchOf<any>
    style?: BunchOf<any>
    props?: BunchOf<any>
    installed_style?: (ElementModifier | ElementInline)[]
}