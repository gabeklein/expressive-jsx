import { Expression, LabeledStatement, Program, Statement } from '@babel/types';
import { BunchOf, Options, Path, Scope, SharedSingleton, Value } from '../internal/types';
import t from '../internal';

export const env = process.env || {
    NODE_ENV: "production"
};

export const Opts: Options = {
    reactEnv: "web",
    styleMode: "compile",
    output: "ES6",
    formatStyles: ""
}

export const Shared = {} as SharedSingleton;

export function toArray<T> (value: T | T[]): T[] {
    return value !== undefined
        ? Array.isArray(value) 
            ? value 
            : [value] 
        : [];
}

export function WhenSkyIsFalling<O extends BunchOf<string>> (register: O) {
    type ParseError = (path: Path, ...args: Value[]) => Error;

    const Errors = {} as BunchOf<ParseError>

    for(const error in register){
        let message = [] as Value[];

        for(const segment of register[error].split(/\{(?=\d+\})/)){
            const ammend = /(\d+)\}(.+)/.exec(segment);
            if(ammend)
                message.push(parseInt(ammend[1]), ammend[2]);
            else
                message.push(segment);
        }

        Errors[error] = (path: Path, ...args: Value[]) => {
            let quote = "";
            for(const slice of message)
                quote += (
                    typeof slice == "string" 
                        ? slice : args[slice - 1]
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

export function hoistLabeled(node: Program){
    const labeled = [] as LabeledStatement[];
    const other = [] as Statement[];

    let shouldHoist = false;
    let nonLabelFound = false;

    for(const item of node.body){
        if(item.type == "LabeledStatement"){
            shouldHoist = nonLabelFound;
            labeled.push(item);
        }
        else {
            nonLabelFound = true;
            other.push(item as any);
        }
    }

    if(shouldHoist)
        node.body = [...labeled, ...other] as any[];
}

export function ensureUIDIdentifier(
    this: Scope,
    name: string = "temp", 
    useExisting: boolean, 
    didUse: BunchOf<any>){

    name = name.replace(/^_+/, "").replace(/[0-9]+$/g, "");
    let uid;
    let i = 0;

    if(useExisting){
        if(this.hasBinding(uid = name)){
            didUse[uid] = null;
            return t.identifier(uid);
        }
    } else 
        do {
            uid = name + (i > 1 ? i : "");
            i++;
        } 
        while (
            this.hasBinding(uid) || 
            this.hasGlobal(uid) || 
            this.hasReference(uid)
        );

    const program = this.getProgramParent() as any;
    program.references[uid] = true;
    program.uids[uid] = true;
    return t.identifier(uid);
}

export function HEXColor(raw: string){
    raw = raw.substring(2);

    if(raw.length == 1)
        raw = "000" + raw
    else 
    if(raw.length == 2){
        raw = "000000" + raw
    }
    
    if(raw.length % 4 == 0){
        let decimal = [] as any[];

        if(Opts.reactEnv == "native")
            return "#" + raw;

        if(raw.length == 4)
            // (shorthand) 'F.' -> "FF..." -> 0xFF
            decimal = Array.from(raw).map(x => parseInt(x+x, 16))

        else for(let i = 0; i < 4; i++){
            decimal.push(
                parseInt(raw.slice(i*2, i*2+2), 16)
            );
        }

        //decimal for opacity, fixed to prevent repeating like 1/3
        decimal[3] = (decimal[3] / 255).toFixed(3)

        return `rgba(${ decimal.join(",") })`
    }
    else return "#" + raw;
}