const t = require('@babel/types')
const { GeneralModifier } = require("./modifier")
const { Shared, transform, Opts } = require("./shared");
const ReservedModifiers = require("./keywords")
const { ElementInline } = require("./inline")

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
        
        const { Helpers, ...Modifiers } = modifier;

        if(Helpers)
        for(const name in Helpers)
            Stack.valueMod(name, Helpers[name])

        for(const name in Modifiers)
            Stack.propertyMod(name, new GeneralModifier(name, Modifiers[name]))
    }

    return Stack;
}

class StackFrame {
    push(node){
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

    elementMod(name, set){
        name = "_" + name;
        if(set){
            if(this[name])
                set.inherits = this[name];
            this[name] = set;
        }
        else return this[name]
    }

    get allMod(){
        return this.hasOwnProperty("_all") && this._all;
    }

    propertyMod(name, set){
        name = "__" + name;
        if(set) this[name] = set;
        else return this[name]
    }

    hasOwnPropertyMod(named){
        return this.hasOwnProperty("__" + named)
    }

    valueMod(name, set){
        name = "___" + name;
        if(set) this[name] = set;
        else return this[name]
    }

    declare(modifier){
        const { name } = modifier;
        if(name[0] == "_")
            throw body.buildCodeFrameError(`Modifier name cannot start with _ symbol!`)

        if(this.hasOwnProperty(name))
            throw body.buildCodeFrameError(`Duplicate declaration of named modifier!`)

        this.elementMod(name, modifier);
    }

    declareForRuntime(modifier){
        const { program, styleRoot } = this;
        program.computedStyleMayInclude(modifier);
        if(styleRoot)
            styleRoot.computedStyleMayInclude(modifier)
        else return true; //styleroot not found
    }
}
