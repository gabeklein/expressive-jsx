import { VisitNodeObject } from '@babel/traverse';
import {
  BlockStatement,
  DoExpression,
  Expression,
  ExpressionStatement,
  File,
  IfStatement,
  LabeledStatement,
  Statement,
} from '@babel/types';
import { Attribute, ComponentFor, ComponentIf, ElementInline, Prop } from 'handle';
import { ModifyDelegate, StackFrame } from 'parse';

export interface BunchOf<T> { [key: string]: T }

export type Visitor<T, S extends StackFrame = StackFrame> = VisitNodeObject<BabelState<S>, T>

export type FlatValue = string | number | boolean | null;

export type SequenceItem = Attribute | InnerContent | Statement;

export type InnerContent = Expression | ElementInline | ComponentIf | ComponentFor;

export type ModifyAction = (this: ModifyDelegate, ...args: any[]) => ModifierOutput | void;

export type ModiferBody = ExpressionStatement | BlockStatement | LabeledStatement | IfStatement;

export type SelectionProvider = (forSelector: string[]) => void

export interface BabelState<S extends StackFrame = StackFrame> {
  file: File;
  filename: string;
  cwd: string;
  context: S;
  opts: Options;
}

export interface Options {
  hot: boolean;
  output: "js" | "jsx";
  printStyle?: "pretty";
  useImport: boolean;
  modifiers: BunchOf<{}>[];
}

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