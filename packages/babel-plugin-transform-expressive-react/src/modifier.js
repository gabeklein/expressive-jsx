import { Modifier, invocationArguments } from "./attributes";
import { AttrubutesBody } from "./component";
const { Prop, Style, Statement, ChildNonComponent } = require("./item");
const { Opts, Shared } = require("./shared");
const t = require("babel-types");

const StackFrame = {
    push(node){
        node.parent = this.current;
        const frame = node.context = Shared.stack = Object.create(Shared.stack);
        frame.current = node;
    },
    pop(){
        // delete Shared.stack.current.context;
        Shared.stack = Object.getPrototypeOf(this);
    },
    get(name){
        const mod = this[`__${name}`];
        return mod && mod.handler;
    },
    declare(modifier){
        const { name } = modifier;
        if(this.hasOwnProperty(name))
            throw body.buildCodeFrameError(`Duplicate declaration of named modifier!`)

        this[`__${name}`] = modifier;
    }
}

const ReservedModifiers = { 
    is(){
        debugger
    }
};

export function createSharedStack(included = []){
    let Stack = StackFrame;

    for(const inclusion of [ReservedModifiers].concat(included)){
        Stack = Object.create(Stack)

        for(const name in inclusion){
            Stack[`__${name}`] = new StyleModifier(name, inclusion[name])
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
        switch(typeof value){
            case "number":
                value = value.toString()
            case "string":
                this.value = t.stringLiteral(value)
                break
            default:
                this.value = value;
        }
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

    get handler(){
        return (body, recipient) => {
            if(body.type == "ExpressionStatement")
                this.apply(body.get("expression"), recipient);
        }
    }

    apply(args, target){
        const { style, props, attrs } = this.invoke(
            invocationArguments(args), 
            target
        );

        // for(const item in attrs){
        //     const mod = 
        //         target.context.get(item) ||
        //         new StyleModifier(item)

        //     const {
        //         style: nestedStyle,
        //         props: nestedProps,
        //         attrs: nestedAttrs
        //     } = mod.invoke(attrs[item], target);

        //     if(style && style.length)
        // }

        for(const item in style)
            target.add(
                new ExplicitStyle(item, style[item])
            )
    }

    invoke(args, target){

        args = [].concat(args)
        for(const argument of args){
            if(typeof argument == "object" && argument.named){
                const { inner, named } = argument;
                const mod = target.context.get(named)

                argument.computed = mod
                    ? mod.invoke(inner, target).value || ""
                    : `${named}(${inner.join(" ")})`
            }
        }

        return this.transform.apply(this, args);
    }

    transform(){
        let output;

        const args = Array.from(arguments).map(x => x.computed || x)

        if(args[0] == undefined)
            output = ""
        else
            output = Array.from(args).join(" ")

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
                new StyleModifier(name).apply(body.get("expression"), recipient);
                return;

            case "BlockStatement":
                const mod = new Modifier(name, body);
                return mod.declare(recipient);
        }
    }

