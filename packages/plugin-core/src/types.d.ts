import { NodePath as Path, VisitNodeObject } from '@babel/traverse';
import { DoExpression, Expression, Statement } from '@babel/types';
import { Attribute, ComponentFor, ComponentIf, ElementInline } from 'handle';
import { ModifyDelegate, StackFrame } from 'parse';

export interface BunchOf<T> { [key: string]: T }

export type Visitor<T, S extends StackFrame = StackFrame> = VisitNodeObject<BabelState<S>, T>

export type FlatValue = string | number | boolean | null;

export type SequenceItem = Attribute | InnerContent | Path<Statement>;

export type InnerContent = ElementInline | ComponentIf | ComponentFor | Path<Expression> | Expression;

export type ModifyAction = (this: ModifyDelegate, ...args: any[]) => ModifierOutput | void;

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