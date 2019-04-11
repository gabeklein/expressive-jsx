import { VisitNodeObject as BabelVisitor } from '@babel/traverse';
import { Program } from '@babel/types';
import { createHash } from 'crypto';
import { ElementInline, ElementModifier, TraversableBody } from 'internal';
import { BunchOf, ModifyAction } from 'types';

interface BabelState {
    filename: string;
    context: StackFrame;
    opts: any;
}

export default <BabelVisitor<Program>>{
    enter(path, state){
        state.context = new StackFrame(state);
    },
    exit(path, state){
        if(~process.execArgv.join().indexOf("inspect-brk"))
            console.log("done")
    }
}

function Hash(data: string, length?: number){
    return (
        createHash("md5")
        .update(data)
        .digest('hex')
        .substring(0, 6)
    )
}

export class StackFrame {
    loc: string;
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
    ModifierQuery?: string;

    constructor(state: BabelState){

        const included = state.opts.modifiers;
        this.stateSingleton = state;
        this.loc = Hash(state.filename);
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

            for(const name in Modifiers)
                Stack.propertyMod(name, Modifiers[name])
        }
    
        return Stack;
    }

    get parent(){
        return Object.getPrototypeOf(this);
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

    appendWithLocation(){
        const { sequence } = this.current;
        let current = this.current;
        let i = [] as number[];
        let nodePosition: string;

        while(current){
            const index = sequence && sequence.indexOf(current) + 1;

            if(index){
                i.push(index);
                break;
            }

            const last = i.length - 1;
            const tip = i[last];
            if(tip < 2)
                i[last]--
            else 
                i.push(1)
            current = current.parent!;
        }
        nodePosition = i.reverse().join(" ");

        return this.append(nodePosition);
    }

    append(append?: string){
        return this.loc = this.loc + " " + append || ""
    }

    create(node: any){
        const frame = Object.create(this);
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
        do { up = Object.getPrototypeOf(up) } 
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

    elementMod(name: string): ElementModifier;
    elementMod(set: ElementModifier): void;
    elementMod(
        this: BunchOf<ElementModifier>,
        mod: string | ElementModifier){

        if(typeof mod == "string")
            return this["_" + mod];
        
        const name = "_" + mod.name;
        if(this[name])
            mod.inherits = this[name];
        this[name] = mod;
    }

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
