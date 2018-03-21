import { Modifier } from "./attributes";
const { Prop, Style, Statement, ChildNonComponent } = require("./item");
const { Opts, Shared } = require("./shared");

export function HandleModifier(src, recipient) {
    const name = src.node.label.name;
    const body = src.get("body");

    const modifier = recipient.context.get(name);
    modifier(body, recipient);
}

export function createSharedStack(included = []){
    let Stack = {
        push(node){
            node.parent = this.current;
            const frame = node.context = Shared.stack = Object.create(Shared.stack);
            frame.current = node;
        },
        pop(){
            delete Shared.stack.node.context;
            Shared.stack = Object.getPrototypeOf(this);
        },
        get(name){
            const mod = this[`__${name}`];
            return mod && mod.handler || this.modifyDefault(name);
        },
        declare(modifier){
            const { name } = modifier;
            const ref = `__${name}`;

            if(this.hasOwnProperty(ref))
                body.buildCodeFrameError(`Duplicate declaration of named modifier!`)

            this[ref] = modifier;
        }
    }

    Stack = Object.assign(Object.create(Stack), SpecialModifiers);
    
    for(const inclusion of included){
        Stack = Object.create(Stack);
        for(const name in inclusion)
            Stack[`__${name}`] = inclusion[name]
    }

    return Stack;
}

const SpecialModifiers = {
    modifyDefault(name){
        return (body, recipient) => {
            switch(body.type){
                case "ExpressionStatement":
                    return Style.applyTo(name, recipient, body)

                case "BlockStatement": {
                    const mod = new Modifier(name, body);
                    mod.declare(recipient)
                }
            }
        }
    }
};

class StyleModifier extends Modifier {

    invoke(recipient, inline){
        debugger
    }

}