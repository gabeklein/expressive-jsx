import { Path } from '@babel/traverse';
import {
    Expression,
    JSXAttribute,
    JSXElement,
    JSXExpressionContainer,
    JSXFragment,
    JSXSpreadAttribute,
    JSXSpreadChild,
    JSXText,
} from '@babel/types';
import { ExplicitStyle, StackFrame } from '@expressive/babel-plugin-core';
import { Module } from 'regenerate/module';
import { ElementSwitch } from 'handle/switch';
import { ElementIterate } from 'handle/iterate';

export type JSXContent = JSXElement | JSXFragment | JSXExpressionContainer | JSXText | JSXSpreadChild;
export type Attributes = JSXAttribute | JSXSpreadAttribute;
export type InnerJSX = ContentReact | ElementSwitch | ElementIterate;

export const IsLegalAttribute = /^[a-zA-Z_][\w-]*$/;
export const IsLegalIdentifier = /^[a-zA-Z_]\w*$/;
export const isIdentifierElement = /^[A-Z]\w*$/;

export interface BunchOf<T> {
    [key: string]: T
}

export interface StackFrameExt extends StackFrame {
	Generator: any;
    Module: Module;
    loc: string;
}

export interface BabelState {
    context: StackFrameExt;
    opts: any;
    cwd: string;
    filename: string;
}

export interface BabelVisitor<T> {
    enter?(path: Path<T>, state: BabelState): void;
    exit?(path: Path<T>, state: BabelState): void;
}

export type PropData = {
    name: string | false | undefined, 
    value: Expression
}

export type ContentLike = ContentReact | Expression;

export interface StylesRegistered
    extends Array<ExplicitStyle> {

    selector: string;
    query?: string;
    priority?: number;
}

export interface ContentReact {
    toExpression(): Expression;
}