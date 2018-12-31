import { NodePath as Path } from '@babel/traverse';
import { DoExpression, Expression, SpreadElement, Statement } from '@babel/types';
import { ElementModifier, ModifyDelegate } from 'modifiers';

import { Attribute, ElementInline, GeneralModifier, InnerStatement, NonComponent, StackFrame } from '.';

export { NodePath as Path, Scope } from "@babel/traverse";

export type ListElement = Expression | SpreadElement;
export type ElementItem = Attribute | ElementInline | NonComponent<any> | InnerStatement<any>;
export type ModifyAction = (this: ModifyDelegate, ...args: any[]) => ModifierOutput | undefined;
export type ModTuple = [GeneralModifier, Path<Statement>];

export type Literal = string | number | boolean | null;
export type Value = string | number;

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
    reactEnv: "native" | "web";
    output: "ES6" | "JSX";
    styleMode: "compile";
    formatStyles: any;
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

export interface ModifierOutput {
    attrs?: BunchOf<any>
    style?: BunchOf<any>
    props?: BunchOf<any>
    installed_style?: (ElementModifier | ElementInline)[]
}