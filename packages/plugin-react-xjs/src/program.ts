
import { Program } from '@babel/types';

import { AttributeRecipient } from './component';
import { ElementInline, Shared } from './internal';
import { BabelState, Path } from './types';
// import * as ReservedModifiers from "./keywords";

export default class VisitProgram {
    static enter(
        path: Path<Program>,
        state: BabelState ){

            path.visit
    
        state.context = new StackFrame(state);
    }
    
    static exit(
        path: Path<Program>,
        state: BabelState ){
            
        if(~process.execArgv.join().indexOf("inspect-brk"))
            console.log("done")
    }
}

// type XJSValueHelper = (...args: any[]) => { value?: string };

export class StackFrame {
    program = {} as any;
    styleRoot = {} as any;
    current = {} as any;
    stateSingleton: BabelState;

    constructor(state: BabelState){

        // const included = state.opts.modifiers;
        this.stateSingleton = state;

        let Stack = this;

        // const imported = [
        //     ReservedModifiers,
        //     ...included
        // ];
    
        // for(const modifier of imported){
        //     Stack = Object.create(Stack)
            
        //     const { Helpers, ...Modifiers } = modifier as any;
    
        //     if(Helpers)
        //     for(const name in Helpers)
        //         Stack.valueMod(name, Helpers[name])
    
        //     for(const name in Modifiers)
        //         Stack.propertyMod(name, new GeneralModifier(name, Modifiers[name]))
        // }
    
        return Stack;
    }

    push(node: AttributeRecipient){
        // node.parent = this.current;
        const frame = node.context = this.stateSingleton.context = Object.create(node.context || this);
        frame.current = node;
        if(node instanceof ElementInline)
            frame.currentElement = node;
    }

    pop(){
        Shared.stack = Object.getPrototypeOf(this);
    }

    // declare(modifier: ElementModifier){
    //     const { name, body } = modifier;
    //     if(name[0] == "_")
    //         throw body.buildCodeFrameError(`Modifier name cannot start with _ symbol!`)

    //     if(this.hasOwnProperty(name))
    //         throw body.buildCodeFrameError(`Duplicate declaration of named modifier!`)

    //     this.elementMod(name, modifier);
    // }

    hasOwnPropertyMod(name: string): boolean {
        return this.hasOwnProperty("__" + name)
    }

    // declareForRuntime(modifier: ElementModifier | ElementInline){
    //     const { program, styleRoot } = this;
    //     program.computedStyleMayInclude(modifier);
    //     if(styleRoot)
    //         styleRoot.computedStyleMayInclude(modifier)
    //     else return true; //styleroot not found
    // }

    get parent(){
        return Object.getPrototypeOf(this);
    }

    // get allMod(){
    //     return this.hasOwnProperty("_all") && (this as any)._all as GeneralModifier;
    // }

    // elementMod(name: string): ElementModifier;
    // elementMod(name: string, set: ElementModifier): void;
    // elementMod(
    //     this: BunchOf<ElementModifier>,
    //     name: string, 
    //     set?: ElementModifier){

    //     name = "_" + name;
    //     if(set){
    //         if(this[name])
    //             set.inherits = this[name];
    //         this[name] = set;
    //     }
    //     else return this[name]
    // }

    // propertyMod(name: string): GeneralModifier;
    // propertyMod(name: string, set: GeneralModifier): void;
    // propertyMod(
    //     this: BunchOf<GeneralModifier>, 
    //     name: string, 
    //     set?: GeneralModifier){

    //     name = "__" + name;
    //     if(set) this[name] = set;
    //     else return this[name]
    // }

    // valueMod(name: string): XJSValueHelper;
    // valueMod(name: string, set: XJSValueHelper): void;
    // valueMod(
    //     this: BunchOf<XJSValueHelper>,
    //     name: string, 
    //     set?: XJSValueHelper ){
            
    //     name = "___" + name;
    //     if(set) this[name] = set;
    //     else return this[name]
    // }
}
