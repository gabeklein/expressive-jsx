import { NodePath } from '@babel/traverse';
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
import { ExplicitStyle, StackFrame as CoreStackFrame, Visitor as CoreVisitor } from '@expressive/babel-plugin-core';
import { ElementReact } from 'handle/element';
import { ElementIterate } from 'handle/iterate';
import { ElementSwitch } from 'handle/switch';
import { ExternalsManager } from 'regenerate/imports';
import { Module } from 'regenerate/module';

export interface Path<T = any> extends NodePath<T> {}

export type JSXContent = JSXElement | JSXFragment | JSXExpressionContainer | JSXText | JSXSpreadChild;
export type Attributes = JSXAttribute | JSXSpreadAttribute;
export type InnerJSX = ElementReact | ElementSwitch | ElementIterate;

export const IsLegalAttribute = /^[a-zA-Z_][\w-]*$/;
export const IsLegalIdentifier = /^[a-zA-Z_]\w*$/;
export const isIdentifierElement = /^[A-Z]\w*$/;

export interface BunchOf<T> {
    [key: string]: T
}

export interface StackFrame extends CoreStackFrame {
	Generator: any;
    Module: Module;
    Imports: ExternalsManager;
    prefix: string;
}

export interface BabelState {
    context: StackFrame;
    opts: any;
    cwd: string;
    filename: string;
}

export type Visitor<T> = CoreVisitor<T, StackFrame>

export type PropData = {
    name: string | false | undefined, 
    value: Expression
}

export type ContentLike = ElementReact | ElementSwitch | ElementIterate | Expression;

export interface StylesRegistered
    extends Array<ExplicitStyle> {

    selector: string;
    query?: string;
    priority?: number;
}
