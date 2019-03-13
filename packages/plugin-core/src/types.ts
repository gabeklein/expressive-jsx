import { NodePath, VisitNodeObject } from '@babel/traverse';
import { DoExpression, Expression, SpreadElement, Statement } from '@babel/types';
import { StackFrame } from 'parse/program';
import { ModifyDelegate } from 'modify/delegate';
import { ElementModifier } from 'modify/element';
import { GeneralModifier } from 'modify/other';
import { ElementInline } from 'handle/element';
import { Attribute, InnerStatement, NonComponent } from 'handle/item';

export interface Path<T = any> extends NodePath<T> {}
export interface BabelVisitor<T> extends VisitNodeObject<T> {}

export interface DoExpressive extends DoExpression {
    meta: ElementInline;
    expressive_visited?: true;
}

// type BabelVisited<T> = (path: Path<T>, state: BabelState) => void;

// export interface BabelVisitor<T>{
//     enter?: BabelVisited<T>;
//     exit?: BabelVisited<T>;
// }

export type ListElement = Expression | SpreadElement;
export type ElementItem = Attribute | ElementInline | NonComponent<any> | InnerStatement<any>;
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