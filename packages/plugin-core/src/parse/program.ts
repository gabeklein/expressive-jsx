
import { Program } from '@babel/types';
import { VisitNodeObject as BabelVisitor } from "@babel/traverse";
import { ElementInline, Shared, AttributeBody, TraversableBody } from 'internal';
import { BunchOf, ModifyAction } from 'types';

interface BabelState {
    context: StackFrame;
    opts: any;
}

export default <BabelVisitor<Program>>{
    enter(path, state){
        // debugger
        state.context = new StackFrame(state);
    },
    exit(path, state){
        if(~process.execArgv.join().indexOf("inspect-brk"))
            console.log("done")
    }
}

export class StackFrame {
    program = {} as any;
    styleRoot = {} as any;
    current = {} as any;
    currentElement?: ElementInline;
    stateSingleton: BabelState;
    options: {
        // generator: { 
        //     new(from: ElementInline | NonComponent): AssembleElement;
        // }
    }

    constructor(state: BabelState){

        const included = state.opts.modifiers;
        this.stateSingleton = state;
        this.options = {
            // generator: AssembleJSX as any
        };

        let Stack = this;

        const imported = [
            // ReservedModifiers,
            ...included
        ];
    
        for(const imports of imported){
            Stack = Object.create(Stack)
            
            const { Helpers, ...Modifiers } = imports as any;
            void Helpers;
        //     if(Helpers)
        //     for(const name in Helpers)
        //         Stack.valueMod(name, Helpers[name])
    
            for(const name in Modifiers)
                Stack.propertyMod(name, Modifiers[name])
        }
    
        return Stack;
    }

    get parent(){
        return Object.getPrototypeOf(this);
    }

    register(node: TraversableBody){
        const frame = this.stateSingleton.context = Object.create(this);
        frame.current = node;
        if(node instanceof ElementInline)
            frame.currentElement = node;
        return frame;
    }

    push(node: AttributeBody){
        // node.parent = this.current;
        const frame = node.context = this.stateSingleton.context;
        frame.current = node;
        if(node instanceof ElementInline)
            frame.currentElement = node;
    }

    pop(){
        Shared.stack = Object.getPrototypeOf(this);
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

    // declare(modifier: ElementModifier){
    //     const { name, body } = modifier;
    //     if(name[0] == "_")
    //         throw body.buildCodeFrameError(`Modifier name cannot start with _ symbol!`)

    //     if(this.hasOwnProperty(name))
    //         throw body.buildCodeFrameError(`Duplicate declaration of named modifier!`)

    //     this.elementMod(name, modifier);
    // }

    // declareForRuntime(modifier: ElementModifier | ElementInline){
    //     const { program, styleRoot } = this;
    //     program.computedStyleMayInclude(modifier);
    //     if(styleRoot)
    //         styleRoot.computedStyleMayInclude(modifier)
    //     else return true; //styleroot not found
    // }

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
