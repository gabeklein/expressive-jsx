
const t = require("babel-types");
const { createHash } = require('crypto');

const { AttrubutesBody } = require("./component");
const { SyntheticProp, ExplicitStyle, Statement, NonComponent } = require("./item");
const { parsedArgumentBody } = require("./attributes");
const { Opts, Shared } = require("./shared");

export class GeneralModifier {

    static applyTo(recipient, src) {
        const name = src.node.label.name;
        const body = src.get("body");
    
        const modifier = 
            recipient.context.propertyMod(name) || new this(name);
    
        modifier.apply(body, recipient);
    }

    constructor(name, transform){
        this.name = name;
        if(transform)
            this.transform = transform;
    }

    apply(body, target){
        const accumulated = { 
            props: {}, 
            style: {}
        };

        let mods = [];
        let i = 0, mod = this;

        while(true){
            let include = new ModifierProcess(mod, body || [], target);
            if(!include){
                i++; continue 
            }

            Object.assign(accumulated.style, include.style);
            Object.assign(accumulated.props, include.props);

            const next = include.attrs || true;
            const pending = [];

            for(const named in next){
                let value = next[named];
                let { context } = target;
    
                if(value == null) continue;
    
                if(named == this.name){
                    let seeking;
                    do { 
                        seeking = !context.hasOwnPropertyMod(named);
                        context = context.parent;
                    }
                    while(seeking);
                }
    
                const mod = context.propertyMod(named) || new GeneralModifier(named);
    
                pending.push([mod, value])
            }
            if(!pending.length)
                if(mod = mods[++i])
                    [mod, body] = mod
                else break;
            else {
                mods = pending.concat(mods.slice(i+1));
                [mod, body] = mods[i = 0];
            }
        }

        this.integrate(target, accumulated);
    }

    integrate(target, { style, props }){
        for(const [AttributeType, typeTarget] of [
            [ExplicitStyle, style], 
            [SyntheticProp, props]
        ])
        for(const item in typeTarget)
            if(typeTarget[item] !== null)
                target.add(
                    new AttributeType(item, typeTarget[item])
                )
    }
}

function invokeModifierDefault(){
    if(this.body.type == "BlockStatement")
        return elementModifierDefault.call(this)
    else 
        return propertyModifierDefault.call(this)
}

function elementModifierDefault(){
    new ElementModifier(this.name, this.body).declare(this.target);
    return null;
}

function propertyModifierDefault() {
    const args = this.arguments.map(arg => {

        if(!!arg && typeof arg == "object" ){
            const { computed, requires } = arg;

            if(computed) 
                return computed.value || "undefined";

            else if(requires)
                return t.callExpression(
                    t.identifier("require"), 
                    [
                        typeof requires == "string"
                            ? t.stringLiteral(requires)
                            : requires
                    ]
                )
                
            else
                return arg;
        }
        else return arg;
    })

    const output = 
        typeof args[0] == "object" || args.length == 1
            ? args[0]
            : Array.from(args).join(" ")

    return {
        style: {
            [this.name]: output
        }
    }
}

class ModifierProcess {
    constructor(mod, body, target){

        const transform = mod.transform || invokeModifierDefault;

        this.target = target;
        this.data = {};
        this.name = mod.name;

        if(!body.type)
            Object.defineProperty(this, "arguments", { value: body })
        else 
            this.body = body;

        let initialArguments = transform.length > 0 ? this.arguments : [];
            initialArguments = Array.isArray(initialArguments) ? initialArguments : [initialArguments]
        const transformOutput = transform.apply(this, initialArguments);

        if(this.done || transformOutput === null) return;

        if(transformOutput)
            this.assign(transformOutput)

        return this.data;
    }

    get arguments(){

        const args = new parsedArgumentBody(this.body);

        const { context } = this.target;

        for(const argument of args)
            if(argument && typeof argument == "object" && argument.named){
                const { inner, named, location } = argument;
                const valueMod = this.target.context.valueMod(named);

                if(valueMod) try {
                    const computed = valueMod(...inner)

                    if(computed.value) argument.computed = computed; else 
                    if(computed.require) argument.requires = computed.require;

                } catch(err) {
                    throw location && location.buildCodeFrameError(err.message) || err

                } else {
                    argument.computed = {value: `${ named }(${ inner.join(" ") })`}
                }
            }

        Object.defineProperty(this, "arguments", { value: args })

        return args;
    }

    assign(data){
        for(const field in data)
            if(this.data[field])
                Object.assign(this.data[field], data[field])
            else this.data[field] = data[field]
    }
}

export class ElementModifier extends AttrubutesBody {

    precedence = 0
    classList = [];
    provides = [];
    inlineType = "stats"

    constructor(name, body){
        super()
        this.name = name;
        this.body = body;

        if(Opts.reactEnv != "native")
            this.style_static = [];

        Shared.stack.push(this);
        this.scope = body.scope;

        if(typeof this.init == "function")
            this.init(path);
    }  

    get handler(){
        const inheriting = this;
        const usingName = this.name;
        return (body, recipient) => {
            if(body.type == "BlockStatement")
                new ElementModifier(usingName, body, inheriting).declare(recipient);
            else 
                this.insert( recipient, new parsedArgumentBody(body), false )
        }
    }

    declare(recipient){
        recipient.includeModifier(this);
        this.process();
    }

    process(){
        for(const item of this.body.get("body"))
            if(item.type in this) 
                this[item.type](item);
            else throw item.buildCodeFrameError(`Unhandled node ${item.type}`)

        this.didExitOwnScope()
    }

    includeModifier(modifier){
        this.provides.push(modifier)
        modifier.declareForComponent(this.contextParent)
    }

    didExitOwnScope(path){
        if(this.props.length)
            this.type = "props"
        if(this.style.length)
            this.type = this.type ? "both" : "style"
        if(this.style_static)
            this.hash = createHash("md5")
                .update(this.style_static.reduce((x,y) => x + y.asString, ""))
                .digest('hex')
                .substring(0, 6);
        
        super.didExitOwnScope(path)

        if(Opts.reactEnv != "native")
            this.classname = `${this.name}-${this.hash}`
    }

    declareForComponent(recipient){
        this.contextParent = recipient;
        recipient.add(this);

        if(Opts.reactEnv == "native") return;

        const { program, styleRoot } = recipient.context;
        program.computedStyleMayInclude(this);
        if(styleRoot)
            styleRoot.computedStyleMayInclude(this);
    }

    insert(target, args, inline){
        if(!inline && !args.length) return;
        this.into(inline)
    }

    output(){
        let { props, style } = this;
        let declaration;

        props = props.length && t.objectExpression(props.map(x => x.asProperty));
        style = style.length && t.objectExpression(style.map(x => x.asProperty));

        declaration = 
            ( this.type == "both" )
            ? t.objectExpression([
                t.objectProperty(t.identifier("props"), props),
                t.objectProperty(t.identifier("style"), style)
            ]) 
            : props || style;

        if(declaration){
            const id = this.id || (this.id = this.scope.generateUidIdentifier(this.name)); 
            return t.variableDeclaration("const", [
                t.variableDeclarator(
                    id, declaration
                )
            ])
        }
    }

    into(inline, target){
        if(this.style_static !== this.style && this.style_static.length)
            inline.css.push(this.classname)
            
        if(this.inherits) this.inherits.into(inline);
        
        if(!this.style.length && !this.props.length) return

        const { style, props, css } = inline;
        const id = this.id || (this.id = this.scope.generateUidIdentifier(this.name)); 

        if(this.props.length && this.style.length){
            props.push(t.spreadProperty(
                t.memberExpression(
                    id, t.identifier("props")
                )
            ))
            style.push(t.spreadProperty(
                t.memberExpression(
                    id, t.identifier("style")
                )
            ))
        }
        else {
            inline[this.type].push(
                t.spreadProperty(id)
            );
        }

        for(const name of this.classList)
            if(typeof name == "string")
                if(target.classList.indexOf(name) < 0)
                    target.classList.push(name);
    }
}