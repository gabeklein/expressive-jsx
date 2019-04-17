import { Expression } from '@babel/types';
import { BunchOf, Options, Path, SharedSingleton, FlatValue } from 'types';
import { createHash } from 'crypto';

export const env = process.env || {
    NODE_ENV: "production"
};

export const Opts: Options = {
    env: "web",
    styleMode: "compile",
    output: "js",
    formatStyles: ""
}

export function quickHash(data: string, length?: number){
    return (
        createHash("md5")
        .update(data)
        .digest('hex')
        .substring(0, 6)
    )
} 

export const Shared = {} as SharedSingleton;

export function toArray<T> (value: T | T[]): T[] {
    return value !== undefined
        ? Array.isArray(value) 
            ? value 
            : [value] 
        : [];
}

export function preventDefaultPolyfill(element: Path){
    element.parentPath.remove();
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

export function inParenthesis(path: Path<Expression>): boolean {
    const node = path.node as any;
    return node.extra ? node.extra.parenthesized === true : false;
}