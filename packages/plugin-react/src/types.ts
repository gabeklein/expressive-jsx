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
import * as Core from '@expressive/babel-plugin-core';
import { GenerateReact } from 'generate/element';
import { ElementReact } from 'translate/element';
import { ElementIterate } from 'translate/iterate';
import { ElementSwitch } from 'translate/switch';
import { Module } from 'regenerate/module';
import { ExternalsManager } from 'regenerate/scope';

export type JSXContent = JSXElement | JSXFragment | JSXExpressionContainer | JSXText | JSXSpreadChild;
export type Attributes = JSXAttribute | JSXSpreadAttribute;
export type InnerJSX = ElementReact | ElementSwitch | ElementIterate;
export type ContentLike = ElementReact | ElementSwitch | ElementIterate | Expression;
export type Visitor<T> = Core.Visitor<T, StackFrame>

export const IsLegalAttribute = /^[a-zA-Z_][\w-]*$/;
export const IsLegalIdentifier = /^[a-zA-Z_]\w*$/;
export const isIdentifierElement = /^[A-Z]\w*$/;

export interface BunchOf<T> {
  [key: string]: T
}

export interface StackFrame extends Core.StackFrame {
  Generator: GenerateReact;
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

export interface PropData {
  name: string | false | undefined
  value: Expression
}