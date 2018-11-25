import { 
    BunchOf
} from "./types";

import {
    ElementModifier,
    GeneralModifier,
    ElementInline,
    Shared,
    Opts
} from "./internal";

import * as ReservedModifiers from "./keywords";

type XJSValueHelper = (...args: any[]) => {
    value?: string 
};

export type XJSValueModifiers = BunchOf<XJSValueHelper>

export function createSharedStack(included = []){
    let Stack = new StackFrame;

    const imported = [
        ReservedModifiers,
        ...included
    ]

    Stack.styleMode = {}

    if(Opts.reactEnv == "native"){
        Stack.styleMode.native = true;
    }
    else {
        Stack.styleMode.css = true;
    }

    Stack.styleMode.compile = Opts.styleMode == "compile";

    for(const modifier of imported){
        Stack = Object.create(Stack)
        
        const { Helpers, ...Modifiers } = modifier as any;

        if(Helpers)
        for(const name in Helpers)
            Stack.valueMod(name, Helpers[name])

        for(const name in Modifiers)
            Stack.propertyMod(name, new GeneralModifier(name, Modifiers[name]))
    }

    return Stack;
}

export class StackFrame {

    [key: string]: GeneralModifier | XJSValueHelper | ElementModifier | any;

    program = {} as any;
    styleRoot = {} as any;
    current = {} as any;

    push(node: any){
        node.parent = this.current;
        const frame = node.context = Shared.stack = Object.create(Shared.stack);
        if(node instanceof ElementInline)
            frame.currentElement = node;
        frame.current = node;
    }

    get parent(){
        return Object.getPrototypeOf(this);
    }

    pop(){
        Shared.stack = Object.getPrototypeOf(this);
    }

    elementMod(name: string, set?: any){
        name = "_" + name;
        if(set){
            if(this[name])
                set.inherits = this[name];
            this[name] = set;
        }
        else return this[name]
    }

    get allMod(){
        return this.hasOwnProperty("_all") && this._all as GeneralModifier;
    }

    hasOwnPropertyMod(name: string){
        return this.hasOwnProperty("__" + name)
    }

    propertyMod(name: string): GeneralModifier;
    propertyMod(name: string, set: GeneralModifier): void;
    propertyMod(name: string, set?: GeneralModifier){
        name = "__" + name;
        if(set) this[name] = set;
        else return this[name]
    }

    valueMod(name: string): XJSValueHelper;
    valueMod(name: string, set: XJSValueHelper): void;
    valueMod(name: string, set?: XJSValueHelper){
        name = "___" + name;
        if(set) this[name] = set;
        else return this[name]
    }

    declare(modifier: ElementModifier){
        const { name, body } = modifier;
        if(name[0] == "_")
            throw body.buildCodeFrameError(`Modifier name cannot start with _ symbol!`)

        if(this.hasOwnProperty(name))
            throw body.buildCodeFrameError(`Duplicate declaration of named modifier!`)

        this.elementMod(name, modifier);
    }

    declareForRuntime(modifier: ElementModifier | ElementInline){
        const { program, styleRoot } = this;
        program.computedStyleMayInclude(modifier);
        if(styleRoot)
            styleRoot.computedStyleMayInclude(modifier)
        else return true; //styleroot not found
    }
}
