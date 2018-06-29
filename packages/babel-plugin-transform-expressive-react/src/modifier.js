
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

            if(typeof modifier == "function") modifier(body, recipient);
            else if(modifier) modifier.handler(body, recipient);
            else new GeneralModifier(name).apply(body, recipient);
        return;

        case "BlockStatement":
            const mod = new ModifierBlockEnv[Opts.reactEnv](name, body);
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
        return this.apply.bind(this)
    }

    apply(args, target){

        const style = {};
        const props = {};
        const computed = { 
            props, 
            style
        };

        this.invoke( 
            target, 
            new parsedArgumentBody(args), 
            computed
        );

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

    invoke(target, args, computed){

        const { context } = target;

        const { assign, getPrototypeOf } = Object;

        args = args === undefined
            ? [] : [].concat(args)

        for(const argument of args)
            if(argument && typeof argument == "object" && argument.named){
                const { inner, named, location } = argument;
                const mod = context[`__${named}`]

                if(mod) try {
                    const computed = mod.transform(...inner)

                    if(computed.value) argument.computed = computed;
                    else 
                    if(computed.require) argument.requires = computed.require;

                } catch(err) {
                    throw location && location.buildCodeFrameError(err.message) || err

                } else {
                    argument.computed = {value: `${named}(${inner.join(" ")})`}
                }
            }

        if(typeof this.transform != "function") debugger
        const modify = this.transform.apply({ target, name: this.name }, args);
        
        if(!modify) return

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

            const mod = ctx.get(named) || new GeneralModifier(named);

            if(value.type)
                value = new parsedArgumentBody(value);

            mod.invoke(target, value, computed);
        }

        assign(computed.style, modify.style);
        assign(computed.props, modify.props);

        return computed;
    }

    transform(){
        const args = [].map.call(arguments, (arg) => {

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
}

export class ComponentModifier extends AttrubutesBody {

    precedence = 0
    classList = [];
    provides = [];

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
                this.insert( recipient, new parsedArgumentBody(body), false )
        }
    }

    declare(recipient){
        recipient.includeModifier(this);
    }

    includeModifier(modifier){
        this.provides.push(modifier)
        modifier.declareForComponent(this.contextParent)
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

    declareForComponent(recipient){
        this.contextParent = recipient;
        recipient.add(this);
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

class ClassNameComponentModifier extends InlineComponentModifier {

    style_static = [];

    declareForComponent(recipient){
        super.declareForComponent(recipient);
        const { program, styleRoot } = recipient.context;
        program.computedStyleMayInclude(this);
        if(styleRoot)
            styleRoot.computedStyleMayInclude(this);
    }

    insert(target, args, inline){
        if(!inline && !args.length) return;
        this.into(inline, target)
    }

    didExitOwnScope(path){
        super.didExitOwnScope(path)
        this.classname = `${this.name}-${this.hash}`
    }

    into(inline, target){
        if(this.style_static !== this.style && this.style_static.length)
            inline.css.push(this.classname)
        super.into(inline, target);

        for(const name of this.classList)
            if(typeof name == "string")
                if(target.classList.indexOf(name) < 0)
                    target.classList.push(name);
    }
}

export const ModifierBlockEnv = {
    native: InlineComponentModifier,
    next:   ClassNameComponentModifier
}
