import { NodePath as Path, VisitNodeObject } from '@babel/traverse';
import {
    BlockStatement,
    DoExpression,
    Expression,
    ExpressionStatement,
    IfStatement,
    LabeledStatement,
    Statement,
} from '@babel/types';
import { Attribute, ComponentFor, ComponentIf, ElementInline } from 'handle';
import { ModifyDelegate, StackFrame } from 'parse';

export interface BunchOf<T> { [key: string]: T }

export type Visitor<T, S extends StackFrame = StackFrame> = VisitNodeObject<BabelState<S>, T>

export type FlatValue = string | number | boolean | null;

export type SequenceItem = Attribute | InnerContent | Path<Statement>;

export type InnerContent = Path<Expression> | Expression | ElementInline | ComponentIf | ComponentFor;

export type ModifyAction = (this: ModifyDelegate, ...args: any[]) => ModifierOutput | void;

export type ModiferBody = Path<ExpressionStatement | BlockStatement | LabeledStatement | IfStatement>;

export type SelectionProvider = (forSelector: string[]) => void

export interface BabelState<S extends StackFrame = StackFrame> {
    filename: string;
    cwd: string;
    context: S;
    opts: any;
}

export interface DoExpressive extends DoExpression {
    meta: ElementInline;
    expressive_visited?: true;
}

export interface ModifierOutput {
    attrs?: BunchOf<any>
    style?: BunchOf<any>
    props?: BunchOf<any>
}

export interface CallAbstraction extends Array<any> {
    callee: string;
}

export interface IfAbstraction {
    [type: string]: (...args: any[]) => any;
    test: any;
}