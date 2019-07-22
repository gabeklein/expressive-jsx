import { NodePath as Path } from '@babel/traverse';
import { BaseNode, Expression, File } from '@babel/types';
import { BunchOf, FlatValue } from 'types';

const { isArray } = Array;

interface Options {
    compact_vars?: true;
    env: "native" | "web";
    output: "js" | "jsx";
    styleMode: "compile";
    formatStyles: any;
}

export interface BabelFile extends File {
    buildCodeFrameError<TError extends Error>(node: BaseNode, msg: string, Error?: new (msg: string) => TError): TError;
}

export interface SharedSingleton {
    stack: any
    opts?: any
    state: {
        expressive_for_used?: true;
    }
    currentFile: BabelFile
    styledApplicationComponentName?: string
}

export const Shared = {} as SharedSingleton;

export const env = process.env || {
    NODE_ENV: "production"
};

export const Opts: Options = {
    env: "web",
    styleMode: "compile",
    output: "js",
    formatStyles: ""
}

const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

export function hash(data: string, length: number = 3){
    let hash = 0;
    let result = '';
    let mod: number;
    for (var i = 0; i < data.length; i++) {
        var char = data.charCodeAt(i);
        hash = ((hash<<5)-hash)+char;
        hash = hash & hash;
    }
    hash = Math.abs(hash)
    do {
        mod = hash % 62;
        result = ALPHA[mod] + result;
        hash = Math.floor(hash / 62);
    } while(hash > 0);

    return result.slice(0, length);
}

export function toArray<T> (value: T | T[]): T[] {
    return value !== undefined
        ? isArray(value) 
            ? value 
            : [value] 
        : [];
}

export function inParenthesis(node: Expression): boolean {
    const { extra } = node as any;
    return extra ? extra.parenthesized === true : false;
}

type ParseError = <T extends BaseNode>(node: Path<T> | T, ...args: FlatValue[]) => Error;

export function ParseErrors<O extends BunchOf<string>> (register: O) {

    const Errors = {} as BunchOf<ParseError>

    for(const error in register){
        let message = [] as FlatValue[];

        for(const segment of register[error].split(/\{(?=\d+\})/)){
            const ammend = /(\d+)\}(.*)/.exec(segment);
            if(ammend)
                message.push(parseInt(ammend[1]), ammend[2]);
            else
                message.push(segment);
        }

        Errors[error] = (node, ...args) => {
            if("node" in node)
                node = node.node;

            let quote = "";
            for(const slice of message)
                quote += (
                    typeof slice == "string" 
                        ? slice : args[slice as number - 1]
                )

            return Shared.currentFile.buildCodeFrameError(node, quote);
        }
    }

    return Errors as {
        readonly [P in keyof O]: ParseError
    };
}