import { VisitNodeObject } from '@babel/traverse';
import {
  BlockStatement,
  DoExpression,
  Expression,
  ExpressionStatement,
  File,
  IfStatement,
  JSXAttribute,
  JSXElement,
  JSXExpressionContainer,
  JSXFragment,
  JSXSpreadAttribute,
  JSXSpreadChild,
  JSXText,
  LabeledStatement,
  Node,
  Statement,
} from '@babel/types';
import { Attribute, ComponentFor, ComponentIf, ElementInline, Prop } from 'handle';
import { ModifyDelegate } from 'parse/modifier';
import { StackFrame } from 'parse/program';
import { ElementReact } from 'translate/element';
import { ElementIterate } from 'translate/iterate';
import { ElementSwitch } from 'translate/switch';

export type JSXContent = JSXElement | JSXFragment | JSXExpressionContainer | JSXText | JSXSpreadChild;
export type Attributes = JSXAttribute | JSXSpreadAttribute;
export type InnerJSX = ElementReact | ElementSwitch | ElementIterate;
export type ContentLike = ElementReact | ElementSwitch | ElementIterate | Expression;
export type Visitor<T, S extends StackFrame = StackFrame> = VisitNodeObject<BabelState<S>, T>;

export const IsLegalAttribute = /^[a-zA-Z_][\w-]*$/;
export const IsLegalIdentifier = /^[a-zA-Z_]\w*$/;
export const isIdentifierElement = /^[A-Z]\w*$/;

export interface BunchOf<T> {
  [key: string]: T
}

export interface BabelFile extends File {
  buildCodeFrameError<TError extends Error>(node: Node, msg: string, Error?: new (msg: string) => TError): TError;
}

export interface SharedSingleton {
  opts: Options;
  stack: StackFrame;
  currentFile: BabelFile;
}

export interface Options {
  hot?: boolean;
  env?: "native" | "web";
  output?: "js" | "jsx";
  pragma?: "react";
  runtime?: string;
  styleMode?: "compile" | "inline";
  printStyle?: "pretty";
  useRequire?: boolean;
  useImport?: boolean;
  modifiers?: BunchOf<{}>[];
}

export interface BabelState<S extends StackFrame = StackFrame> {
  file: File;
  filename: string;
  cwd: string;
  context: S;
  opts: Options;
}

export interface PropData {
  name: string | false | undefined
  value: Expression
}

export type FlatValue = string | number | boolean | null;
export type SequenceItem = Attribute | InnerContent | Statement;
export type InnerContent = Expression | ElementInline | ComponentIf | ComponentFor;
export type ModifyAction = (this: ModifyDelegate, ...args: any[]) => ModifierOutput | void;
export type ModiferBody = ExpressionStatement | BlockStatement | LabeledStatement | IfStatement;
export type SelectionProvider = (forSelector: string[]) => void;

export interface DoExpressive extends DoExpression {
  meta: ElementInline;
  expressive_visited?: true;
  expressive_parent?: Prop;
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