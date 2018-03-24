import { Modifier, invocationArguments } from "./attributes";
import { AttrubutesBody } from "./component";
const { Prop, Style, Statement, ChildNonComponent } = require("./item");
const { Opts, Shared } = require("./shared");
const t = require("babel-types")

const ReservedModifiers = { 
    is(){
        debugger
    }
};

const StackFrame = {
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
        const mod = this[name];
        return mod && mod.handler;
    },
    declare(modifier){
        const { name } = modifier;

        if(this.hasOwnProperty(name))
            throw body.buildCodeFrameError(`Duplicate declaration of named modifier!`)

        this[`__${name}`] = modifier;
    }
}


export function createSharedStack(included = []){
    let Stack = StackFrame;

    for(const inclusion of [ReservedModifiers].concat(included)){
        Stack = Object.create(Stack)

        for(const name in inclusion){
            Stack[name] = new StyleModifier(name, inclusion[name])
        }
    }

    return Stack;
}

export function HandleModifier(src, recipient) {
    const name = src.node.label.name;
    const body = src.get("body");

    const modifier = 
        recipient.context.get(name) || 
        LabeledStatementDefault(name);

    modifier(body, recipient);
}

class ExplicitStyle {
    inlineType = "style"

    constructor(name, value) {
        this.id = t.identifier(name);
        this.value = t.stringLiteral(value.toString());
    }

    get asProperty(){
        return t.objectProperty(this.id, this.value);
    }

    asAssignedTo(target){
        return t.expressionStatement(
            t.assignmentExpression("=",
                t.memberExpression(target, this.id), this.value
            )
        )
    }
}

class StyleModifier {

    constructor(name, transform) {
        this.name = name;
        if(transform)
            this.transform = transform;
    }

    invoke(body, target){
        const args = invocationArguments(body.get("expression"));

        const { style } = this.transform.apply(this, [].concat(args));
        for(const item in style)
            target.add(
                new ExplicitStyle(item, style[item])
            )
    }

    get handler(){
        return (body, recipient) => {
            if(body.type == "ExpressionStatement")
                this.invoke(body, recipient);
        }
    }

    transform(a, b, c){
        let output;
        if(typeof a == "number" && typeof b == "string")
            output = `${a}${b}`;
        else
            output = a.toString();

        return {
            style: {
                [this.name]: output
            }
        }
    }
}

const LabeledStatementDefault = (name) => 
    (body, recipient) => {
        switch(body.type){
            case "ExpressionStatement": 
                new StyleModifier(name).invoke(body, recipient);
                return;

            case "BlockStatement":
                const mod = new Modifier(name, body);
                return mod.declare(recipient);
        }
    }

