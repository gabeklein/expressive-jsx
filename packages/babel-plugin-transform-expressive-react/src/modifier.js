
const t = require("babel-types");
const { createHash } = require('crypto');

const { AttrubutesBody } = require("./component");
const { SyntheticProp, ExplicitStyle, Statement, NonComponent } = require("./item");
const { parsedArgumentBody } = require("./attributes");
const { Opts, Shared } = require("./shared");

export function HandleModifier(src, recipient) {
    const name = src.node.label.name;
    const body = src.get("body");

    const modifier = recipient.context.propertyMod(name);

    switch(body.type){
        case "EmptyStatement":
        case "ExpressionStatement": 
            if(typeof modifier == "function") modifier(body, recipient);
            else if(modifier) modifier.apply(body, recipient);
            else new PropertyModifier(name).apply(body, recipient);
        return;

        case "BlockStatement":
            const mod = new ElementModifier(name, body);
            mod.declare(recipient);
        return 
    } 
}

export class PropertyModifier {

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

    invoke(target, args = [], computed){

        const { context } = target;

        args = [].concat(args);

        for(const argument of args)
            if(argument && typeof argument == "object" && argument.named){
                const { inner, named, location } = argument;
                const transform = target.context.valueMod(named);

                if(transform) try {
                    const computed = transform(...inner)

                    if(computed.value) argument.computed = computed;
                    else 
                    if(computed.require) argument.requires = computed.require;

                } catch(err) {
                    throw location && location.buildCodeFrameError(err.message) || err

                } else {
                    argument.computed = {value: `${named}(${inner.join(" ")})`}
                }
            }

        const modify = this.transform.apply({ target, name: this.name }, args);
        
        if(!modify) return

        this.reprocessOutput(modify.attrs, target, computed)

        Object.assign(computed.style, modify.style);
        Object.assign(computed.props, modify.props);

        return computed;
    }

    reprocessOutput(attrs, target, computed){
        let { context } = target;
        for(const named in attrs){
            let value = attrs[named];

            if(value == null) continue;

            if(named == this.name){
                let seeking;
                do { 
                    seeking = !context.hasOwnPropertyMod(named);
                    context = context.parent;
                }
                while(seeking);
            }

            const mod = context.propertyMod(named) || new PropertyModifier(named);

            if(value.type)
                value = new parsedArgumentBody(value);

            mod.invoke(target, value, computed);
        }
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

export class ElementModifier extends AttrubutesBody {

    precedence = 0
    classList = [];
    provides = [];
    inlineType = "stats"

    constructor(name, body, inherited){
        super()
        this.name = name;
        if(inherited)
            this.inherits = inherited;

        if(Opts.reactEnv != "native")
            this.style_static = [];

        Shared.stack.push(this);
        this.scope = body.scope;

        if(typeof this.init == "function")
            this.init(path);

        for(const item of body.get("body"))
            if(item.type in this) 
                this[item.type](item);
            else throw item.buildCodeFrameError(`Unhandled node ${item.type}`)

        this.didExitOwnScope()
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