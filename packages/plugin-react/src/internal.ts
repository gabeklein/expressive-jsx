import { Path } from '@babel/traverse';
import { StackFrame } from '@expressive/babel-plugin-core';
import { ModuleInsertions } from 'create/polyfill';

export interface StackFrameExt extends StackFrame {
    Module: ModuleInsertions;
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

export * from "create/content";
export * from "create/polyfill";
export * from "create/element";
export * from "create/component";
export * from "create/switch";
export * from "create/iterate";