import { Program as BabelProgram } from '@babel/types';
import { ComponentIf, ElementInline, ElementModifier, TraversableBody } from 'handle';
import { BabelFile, hash, ParseErrors, Shared } from 'shared';
import { BabelState, BunchOf, ModifyAction, Visitor } from 'types';

import * as builtIn from './builtin';

const { getPrototypeOf, create, assign } = Object;

const Error = ParseErrors({
    IllegalAtTopLevel: "Cannot apply element styles in top-level of program",
    BadModifierName: "Modifier name cannot start with _ symbol!",
    DuplicateModifier: "Duplicate declaration of named modifier!"
})

export const Program = <Visitor<BabelProgram>>{
    enter(path, state: any){
        const context = state.context = new StackFrame(state);

        Shared.currentFile = state.file as BabelFile;

        for(const statement of path.get("body"))
            if(statement.isLabeledStatement()){
                const { name } = statement.node.label;
                const body = statement.get("body");

                if(name[0] == "_")
                    throw Error.BadModifierName(path)

                if(this.context.hasOwnModifier(name))
                    throw Error.DuplicateModifier(path);

                if(body.isExpressionStatement(body))
                    throw Error.IllegalAtTopLevel(statement)

                const mod = new ElementModifier(context, name, body.node);
                context.elementMod(mod)
                statement.remove();
            }
    },
    exit(path, state){
        if(~process.execArgv.join().indexOf("inspect-brk"))
            console.log("done")
    }
}

export class StackFrame {
    prefix: string;
    program = {} as any;
    styleRoot = {} as any;
    current = {} as any;
    currentElement?: ElementInline;
    currentIf?: ComponentIf;
    entryIf?: ComponentIf;
    stateSingleton: BabelState;
    options: {}
    ModifierQuery?: string;

    constructor(state: BabelState){
        let Stack = this;
        const external = [].concat(state.opts.modifiers || []);
        const included = assign({}, ...external);

        this.stateSingleton = state;
        this.prefix = hash(state.filename);
        this.options = {};
    
        for(const imports of [ builtIn, included ]){
            Stack = create(Stack)
            
            const { Helpers, ...Modifiers } = imports as any;

            for(const name in Modifiers)
                Stack.propertyMod(name, Modifiers[name])
        }
    
        return Stack;
    }

    get parent(){
        return getPrototypeOf(this);
    }

    event(
        this: any,
        ref: symbol, 
        set: Function){

        if(set) 
            this[ref] = set;
        else 
            return this[ref]
    }

    dispatch(
        this: any,
        ref: symbol,
        ...args: any[]
    ){
        (<Function>this[ref]).apply(null, args)
    }

    resolveFor(append?: string | number){
        this.prefix = this.prefix + " " + append || "";
    }

    create(node: any){
        const frame = create(this);
        frame.current = node;
        if(node instanceof ElementInline)
            frame.currentElement = node;
        return frame;
    }

    push(node: TraversableBody){
        this.stateSingleton.context = node.context;
    }

    pop(){
        let up = this;
        do { up = getPrototypeOf(up) } 
        while(up.current === undefined)
        this.stateSingleton.context = up;
    }

    propertyMod(name: string): ModifyAction;
    propertyMod(name: string, set: ModifyAction): void;
    propertyMod(
        this: BunchOf<ModifyAction>, 
        name: string, 
        set?: ModifyAction){

        const ref = "__" + name;
        if(set) 
            this[ref] = set;
        else 
            return this[ref]
    }

    hasOwnPropertyMod(name: string): boolean {
        return this.hasOwnProperty("__" + name)
    }

    hasOwnModifier(name: string): boolean {
        return this.hasOwnProperty("_" + name)
    }

    elementMod(name: string): ElementModifier;
    elementMod(set: ElementModifier): void;
    elementMod(
        this: BunchOf<ElementModifier>,
        mod: string | ElementModifier){

        if(typeof mod == "string")
            return this["_" + mod];
        
        const name = "_" + mod.name;
        if(this[name])
            mod.next = this[name];
        this[name] = mod;
    }
}
