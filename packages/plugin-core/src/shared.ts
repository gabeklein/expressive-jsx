import { NodePath as Path } from '@babel/traverse';
import { booleanLiteral, Expression } from '@babel/types';
import { BunchOf, FlatValue } from 'types';

export interface SharedSingleton {
    stack: any
    opts?: any
    state: {
        expressive_for_used?: true;
    }
    styledApplicationComponentName?: string
}

interface Options {
    compact_vars?: true;
    env: "native" | "web";
    output: "js" | "jsx";
    styleMode: "compile";
    formatStyles: any;
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

export function simpleHash(data: string, length: number = 3){
    var hash = 0;
    for (var i = 0; i < data.length; i++) {
        var char = data.charCodeAt(i);
        hash = ((hash<<5)-hash)+char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(36).substring(0, length);
}

export function toArray<T> (value: T | T[]): T[] {
    return value !== undefined
        ? Array.isArray(value) 
            ? value 
            : [value] 
        : [];
}

export function preventDefaultPolyfill(element: Path){
    element.replaceWith(booleanLiteral(false));
}

export function inParenthesis(path: Path<Expression>): boolean {
    const node = path.node as any;
    return node.extra ? node.extra.parenthesized === true : false;
}

export function ParseErrors<O extends BunchOf<string>> (register: O) {
    type ParseError = (path: Path, ...args: FlatValue[]) => Error;

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

        Errors[error] = (path: Path, ...args: FlatValue[]) => {
            let quote = "";
            for(const slice of message)
                quote += (
                    typeof slice == "string" 
                        ? slice : args[slice as number - 1]
                )

            return path.buildCodeFrameError(quote)
        }
    }

    return Errors as {
        readonly [P in keyof O]: ParseError
    };
}