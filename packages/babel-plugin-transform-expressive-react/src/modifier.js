import { parsedArgumentBody } from "./attributes";
import * as ModifierEnv from "./attributes";
import { AttrubutesBody } from "./component";
const { Prop, Statement, ChildNonComponent } = require("./item");
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

        this[`$${name}`] = modifier;
    }
}

const { assign: Assign } = Object;

const ReservedModifiers = { 

    is(...args){
        const out = { 
            attrs: {}, props: {}, style: {}
        };
        let computed;
        for(const arg of args){
            if(typeof arg == "object" && (computed = arg.computed))
                for(const x in computed)
                    Assign(out[x], computed[x])
            else 
                out.attrs[arg] = [];
        }
        return out
    },



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

export function initComputedStyleAccumulator(Stack, build_state){
    const targets = build_state.expressive_computeTargets = [];
    return Object.assign(
        Object.create(Stack),
        //add listener to context
        { program: {
            computedStyleMayInclude(element){
                targets.push(element)
            }
        }}
    )
}

export function HandleModifier(src, recipient) {
    const name = src.node.label.name;
    const body = src.get("body");

    const modifier = 
        body.isExpressionStatement() && 
        recipient.context.get(name)  || 
        LabeledStatementDefault(name)

    modifier(body, recipient);
}

class ExplicitStyle {

    constructor(name, value) {
        this.id = t.identifier(name);
        this.name = name;
        this.static = value;
        switch(typeof value){
            case "number":
                value = value.toString()
            case "string":
                this.value = t.stringLiteral(value)
                this.inlineType = "style_static";
                break
            default:
                this.static = false;
                this.inlineType = "style";
                this.value = value;
        }
    }

    get asString(){
        const name = this.name.replace(/([A-Z]+)/g, "-$1").toLowerCase();
        let { static: value } = this;

        return `${name}: ${value}; `
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
            this.apply(
                recipient, body
            );
        }
    }

    apply(target, args){
        debugger
        const { style, props } = this.invoke( 
            target, new parsedArgumentBody(args)
        );

        for(const item in style)
            if(style[item] !== null)
                target.add(
                    new ExplicitStyle(item, style[item])
                )
    }

    invoke(target, args = []){

        const { assign, getPrototypeOf } = Object;

        debugger

        for(const argument of args){
            if(typeof argument == "object" && argument && argument.named){
                const { inner, named } = argument;
                const mod = target.context[`__${named}`]

                if(mod){
                    argument.computed = mod.invoke(inner, target);
                }
                else 
                    argument.computed = {value: `${named}(${inner.join(" ")})`}
            }
        }

        const computedStyle = {}, computedProps = {};
        const { style, props, attrs } = this.transform.apply(this, args);

        for(const named in attrs){
            let ctx = target.context;
            const value = attrs[named];

            if(value == null) continue;

            if(named == this.name){
                let seeking;
                do { 
                    seeking = !ctx.hasOwnProperty(`__${named}`);
                    ctx = getPrototypeOf(ctx);
                }
                while(seeking);
            }

            const mod = 
                ctx[`__${named}`] ||
                new StyleModifier(named)

            const {
                style,
                props
            } = mod.invoke(target, new parsedArgumentBody(value));

            assign(computedStyle, style)
            assign(computedProps, props)
        }

        if(style) assign(computedStyle, style);
        if(props) assign(computedProps, props);

        return {
            style: computedStyle,
            props: computedProps
        }
    }

    transform(){
        let output;

        const args = Array.from(arguments).map(x => {
            return x && typeof x == "object" && x.computed && x.computed.value || x
        })

        if(typeof args[0] == "object")
            output = args[0]
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
            case "EmptyStatement":
            case "ExpressionStatement": 
                new StyleModifier(name).apply(recipient, body);
                return;

            case "BlockStatement":
                const mod = new ModifierEnv[Opts.reactEnv](name, body);
                return mod.declare(recipient);
        }
    }

