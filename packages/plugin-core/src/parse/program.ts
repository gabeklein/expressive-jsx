import { File, isExpressionStatement, isLabeledStatement, Program as BabelProgram, Statement } from '@babel/types';
import { ComponentIf, ElementInline, ElementModifier } from 'handle';
import { BabelFile, hash, ParseErrors, Shared } from 'shared';
import { BabelState, BunchOf, ModifyAction, Visitor } from 'types';

import * as builtIn from './builtin';

interface Stackable {
    context: StackFrame;
}

const { getPrototypeOf, create, assign } = Object;

const Error = ParseErrors({
    IllegalAtTopLevel: "Cannot apply element styles in top-level of program",
    BadModifierName: "Modifier name cannot start with _ symbol!",
    DuplicateModifier: "Duplicate declaration of named modifier!"
})

export const Program = <Visitor<BabelProgram>>{
    enter({ node }, state: any){
        let context = state.context = new StackFrame(state).create(this);
        context.currentFile = state.file;

        Shared.currentFile = state.file as BabelFile;

        const filtered = [] as Statement[];

        for(const statement of node.body)
            if(isLabeledStatement(statement)){
                const { name } = statement.label;
                const { body } = statement;

                if(name[0] == "_")
                    throw Error.BadModifierName(node)

                if(this.context.hasOwnModifier(name))
                    throw Error.DuplicateModifier(node);

                if(isExpressionStatement(body))
                    throw Error.IllegalAtTopLevel(statement)

                const mod = new ElementModifier(context, name, body);
                context.elementMod(mod)
            }
            else filtered.push(statement);

        node.body = filtered;
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
    currentFile?: File;
    entryIf?: ComponentIf;
    stateSingleton: BabelState;
    options: {}
    ModifierQuery?: string;

    get parent(){
        return getPrototypeOf(this);
    }

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

    create(node: Stackable): StackFrame {
        const frame = create(this);
        frame.current = node;
        if(node instanceof ElementInline)
            frame.currentElement = node;
        return frame;
    }

    push(){
        this.stateSingleton.context = this;
    }
    
    pop(
        meta: ElementInline | ElementModifier, 
        state: BabelState<StackFrame> = this.stateSingleton){
            
        let { context } = state;
        let newContext: StackFrame | undefined;

        while(true){
            newContext = Object.getPrototypeOf(context);
            if(!newContext)
                break;
            if(context.current === meta)
                break;
            context = newContext;
        }

        if(context.current)
            state.context = newContext!;
        else 
            console.error("StackFrame shouldn't bottom out like this");
    }

    resolveFor(append?: string | number){
        this.prefix = this.prefix + " " + append || "";
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

    hasOwnPropertyMod(name: string): boolean {
        return this.hasOwnProperty("__" + name)
    }

    hasOwnModifier(name: string): boolean {
        return this.hasOwnProperty("_" + name)
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
