
const t = require("babel-types");
const { createHash } = require('crypto');

const { AttrubutesBody } = require("./component");
const { SyntheticProp, ExplicitStyle, Statement, NonComponent } = require("./item");
const { parsedArgumentBody } = require("./attributes");
const { Opts, Shared } = require("./shared");

export function HandleModifier(src, recipient) {
    const name = src.node.label.name;
    const body = src.get("body");

    switch(body.type){
        case "EmptyStatement":
        case "ExpressionStatement": 
            const modifier = 
                recipient.context.getModifier(name) ||
                recipient.context.get(name);

            if(modifier) modifier(body, recipient);
            else new GeneralModifier(name).apply(body, recipient);
        return;

        case "BlockStatement":
            const mod = new SpecialModifier[Opts.reactEnv](name, body);
            mod.declare(recipient);
        return 
    } 
}

export class GeneralModifier {

    constructor(name, transform){
        this.name = name;
        if(transform)
            this.transform = transform;
    }

    get handler(){
        return (...args) => this.apply(...args)
    }

    apply(args, target){

        const style = {};
        const props = {};
        const computed = { 
            props, 
            style
        };

        this.invoke( 
            target.context, 
            new parsedArgumentBody(args), 
            computed
        );

        for(const [typeTarget, AttributeType] of [
            [style, ExplicitStyle], 
            [props, SyntheticProp]
        ])
        for(const item in typeTarget)
            if(typeTarget[item] !== null)
                target.add(new AttributeType(item, typeTarget[item]))
                
    }

    invoke(context, args, computed){

        const { assign, getPrototypeOf } = Object;

        args = args === undefined
            ? [] : [].concat(args)

        for(const argument of args)
            if(argument && typeof argument == "object" && argument.named){
                const { inner, named, location } = argument;
                const mod = context[`__${named}`]

                if(mod) try {
                    argument.computed = mod.transform(...inner)

                } catch(err) {
                    throw location && location.buildCodeFrameError(err.message) || err

                } else {
                    argument.computed = {value: `${named}(${inner.join(" ")})`}
                }
            }

        if(typeof this.transform != "function") debugger
        const modify = this.transform(...args);
        
        for(const named in modify.attrs){
            let ctx = context;
            let value = modify.attrs[named];

            if(value == null) continue;

            if(named == this.name){
                let seeking;
                do { 
                    seeking = !ctx.hasOwnProperty(`__${named}`);
                    ctx = getPrototypeOf(ctx);
                }
                while(seeking);
            }

            const mod = ctx[`__${named}`] || new GeneralModifier(named);

            if(value.type)
                value = new parsedArgumentBody(value);

            mod.invoke(context, value, computed);
        }

        assign(computed.style, modify.style);
        assign(computed.props, modify.props);

        return computed;
    }

    transform(){
        const args = [].map.call(arguments, (arg) => {
            return arg 
                && typeof arg == "object" 
                && arg.computed 
                && arg.computed.value 
                || arg
        })

        const output = 
            typeof args[0] == "object"
                ? args[0]
                : Array.from(args).join(" ")

        return {
            style: {
                [this.name]: output
            }
        }
    }
}

class ComponentModifier extends AttrubutesBody {

    precedence = 0

    constructor(name, body, inherited){
        super()
        this.name = name;
        if(inherited)
            this.inherits = inherited;
        this.insertDoIntermediate(body)
    }   

    get handler(){
        const inheriting = this;
        const usingName = this.name;
        return (body, recipient) => {
            if(body.type == "BlockStatement")
                new exports[Opts.reactEnv](usingName, body, inheriting).declare(recipient);
            else 
                this.invoke( recipient, new parsedArgumentBody(body), false )
        }
    }

    declare(recipient){
        recipient.context.declare(this);
    }

    didEnterOwnScope(path){
        //TODO GET RID OF SCOPE
        this.scope = path.scope
        super.didEnterOwnScope(path)
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
    }
}

class InlineComponentModifier extends ComponentModifier {

    inlineType = "stats"

    declare(recipient){
        super.declare(recipient);
        recipient.add(this);
    }

    invoke(target, args, inline){
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

    into(inline){
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
    }
}

class NextJSComponentModifier extends InlineComponentModifier {

    style_static = [];

    constructor(name, body, inherited) {
        super(...arguments)
    }

    declare(recipient){
        super.declare(recipient);
        const { program, styleRoot } = recipient.context;
        program.computedStyleMayInclude(this);
        if(styleRoot)
            styleRoot.computedStyleMayInclude(this);
    }

    invoke(target, args, inline){
        if(!inline && !args.length) return;
        this.into(inline)
    }

    didExitOwnScope(path){
        super.didExitOwnScope(path)
        this.classname = `${this.name}-${this.hash}`
    }

    into(inline){
        if(this.style_static !== this.style && this.style_static.length)
            inline.css.push(this.classname)
        super.into(inline);
    }
}

export const SpecialModifier = {
    native: InlineComponentModifier,
    next:   NextJSComponentModifier
}
