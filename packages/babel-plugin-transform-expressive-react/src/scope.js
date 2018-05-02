const { GeneralModifier } = require("./modifier")
const { Shared } = require("./shared");

export function createSharedStack(included = []){
    let Stack = new StackFrame;

    for(const inclusion of [ReservedModifiers].concat(included)){
        Stack = Object.create(Stack)

        for(const name in inclusion){
            Stack[`__${name}`] = new GeneralModifier(name, inclusion[name])
        }
    }

    return Stack;
}

class StackFrame {
    push(node){
        node.parent = this.current;
        const frame = node.context = Shared.stack = Object.create(Shared.stack);
        frame.current = node;
    }

    pop(){
        // delete Shared.stack.current.context;
        Shared.stack = Object.getPrototypeOf(this);
    }

    getModifier(name){
        const mod = this[`__${name}`];
        return mod && mod.handler;
    }

    get(name){
        const mod = this[`$${name}`];
        return mod && mod.handler;
    }

    declare(modifier){
        const { name } = modifier;
        if(this.hasOwnProperty(name))
            throw body.buildCodeFrameError(`Duplicate declaration of named modifier!`)

        this[`$${name}`] = modifier;
    }
}

const ReservedModifiers = { 

    is(){
        const out = { 
            attrs: {}, props: {}, style: {}
        };
        let computed;
        for(const arg of arguments){
            if(typeof arg == "object" && (computed = arg.computed))
                for(const x in computed)
                    Object.assign(out[x], computed[x])
            else 
                out.attrs[arg] = [];
        }
        return out
    }

};