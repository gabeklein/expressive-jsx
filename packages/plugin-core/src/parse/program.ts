import { Program } from '@babel/types';
import { createHash } from 'crypto';
import { ElementInline, ElementModifier, Modifier, TraversableBody } from 'handle';
import { ComponentIf } from 'handle/switch';
import { ParseErrors } from 'shared';
import { BabelState, BunchOf, ModifyAction, Visitor } from 'types';

const Error = ParseErrors({
    IllegalInProgramContext: "Cannot apply element styles in top-level of program",
    BadModifierName: "Modifier name cannot start with _ symbol!",
    DuplicateModifier: "Duplicate declaration of named modifier!"
})

export default <Visitor<Program>>{
    enter(path, state){
        const context = state.context = new StackFrame(state);

        for(const statement of path.get("body"))
            if(statement.isLabeledStatement()){
                const { name } = statement.node.label;
                const body = statement.get("body");

                if(name[0] == "_")
                    throw Error.BadModifierName(path)

                if(this.context.hasOwnProperty("_" + name))
                    throw Error.DuplicateModifier(path);

                if(body.isExpressionStatement(body))
                    throw Error.IllegalInProgramContext(statement)

                const mod = new ElementModifier(context, name, body);
                context.elementMod(mod)
                statement.remove();
            }
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

const BuiltIn: BunchOf<ModifyAction> = {
    priority(priority: number){
        const { target } = this;
        if(target instanceof Modifier)
            target.priority = priority
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
        const included = state.opts.modifiers;
        const imported = [ BuiltIn, ...included ];

        this.stateSingleton = state;
        this.prefix = Hash(state.filename);
        this.options = {};
    
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

    resolveFor(append?: string | number){
        this.prefix = this.prefix + " " + append || "";
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
