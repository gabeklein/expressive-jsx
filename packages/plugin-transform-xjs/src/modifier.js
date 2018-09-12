
const t = require("@babel/types");
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
            let include = new ModifierProcess(mod, body !== undefined ? body : [], target);
            if(!include){
                i++; continue; 
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
    if(!this.body || this.body.type == "ExpressionStatement")
        return propertyModifierDefault.call(this)
    else 
        return elementModifierDefault.call(this)
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
            else return arg;
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
        let { transform } = mod;
        if(!transform || transform.length > 0 && body.type == "BlockStatement")
            transform = invokeModifierDefault;

        this.target = target;
        this.data = {};
        this.name = mod.name;

        if(!body.type)
            Object.defineProperty(this, "arguments", { value: [].concat(body) })
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

        Object.defineProperty(this, "arguments", { configurable: true, value: args })

        return args;
    }

    assign(data){
        for(const field in data)
            if(this.data[field])
                Object.assign(this.data[field], data[field])
            else this.data[field] = data[field]
    }

    declareElementModifier(){
        const mod = new ExternalSelectionModifier(...arguments)
        if(this.priority) mod.stylePriority = this.priority;
        mod.declare(this.target);
    }

    declareMediaQuery(){
        new MediaQueryModifier(...arguments).declare(this.target)
    }

    parse(ast){
        return new parsedArgumentBody(ast)
    }
}

export class ElementModifier extends AttrubutesBody {

    precedence = 0
    classList = [];
    provides = [];
    opperations = [];
    inlineType = "stats"
    stylePriority = 1

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

    get selector(){
        if(this.context.selectionContingent)
            return this.context.selectionContingent.getSelectorForNestedModifier(this);
        else return this.uniqueClassname;
    }

    get path(){
        if(this.selectAgainst)
            return this.selectAgainst.path.concat(` ${this.uniqueClassname}`)
        else return [ this.uniqueClassname ];
    }

    declare(recipient){
        this.context.nearestStyleProvider = this;
        this.process();
        recipient.includeModifier(this);
    }

    onComponent(f){
        this.opperations.push(f);
    }

    includeModifier(modifier){
        this.provides.push(modifier)
        if(this.selectAgainst){
            modifier.selectAgainst = this.selectAgainst;
            modifier.stylePriority = 3
            modifier.declareForStylesInclusion(this.selectAgainst.parent)
        }
        else
        modifier.declareForComponent(this.context.current)
    }

    declareForComponent(recipient){
        if(/*this.context.styleMode.compile &&*/ this.style_static.length){
            this.contextParent = recipient;
            recipient.add(this);
            const noRoot = this.declareForStylesInclusion(recipient);
            if(noRoot){
                recipient.context.modifierInsertions.push(this);
            }
        } 
    }

    declareForConditional(recipient){
        if(this.context.styleMode.compile){
            this.selectAgainst = this.parent;
            this.stylePriority = 3
            this.declareForStylesInclusion(recipient.parent);
        }
    }

    process(){
        let { body } = this;

        body = 
            body.type == "BlockStatement" ? body.get("body") :
            body.type == "LabeledStatement" && [body];

        for(const item of body)
            if(item.type in this) 
                this[item.type](item);
            else throw item.buildCodeFrameError(`Unhandled node ${item.type}`)

        this.didExitOwnScope()
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

        if(this.context.styleMode.compile){
            let { name, hash, selectAgainst } = this;
            this.uid = `${name}-${hash}`
            this.uniqueClassname = "." + this.uid;
        }
    }

    insert(target, args, inline){
        for(const op of this.opperations)
            op(target, inline)
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
        if(this.style_static !== this.style && this.style_static.length){
            inline.css.push(this.uid)
        }
            
        if(this.inherits) this.inherits.into(inline);
        
        if(!this.style.length && !this.props.length) return

        const { style, props, css } = inline;
        const id = this.id || (this.id = this.scope.generateUidIdentifier(this.name)); 

        if(this.props.length && this.style.length){
            props.push(t.SpreadElement(
                t.memberExpression(
                    id, t.identifier("props")
                )
            ))
            style.push(t.SpreadElement(
                t.memberExpression(
                    id, t.identifier("style")
                )
            ))
        }
        else {
            inline[this.type].push(
                t.SpreadElement(id)
            );
        }

        for(const name of this.classList)
            if(typeof name == "string")
                if(target.classList.ideclareMediaQuerydexOf(name) < 0)
                    target.classList.push(name);
    }
}

class ExternalSelectionModifier extends ElementModifier {
    inlineType = "none"
    
    constructor(name, body, fn){
        super(name, body, fn);
        if(fn)
            this.transform = fn;
        this.stylePriority = 5
    }

    declare(recipient){
        this.recipient = recipient;
        this.selectAgainst = recipient;
        recipient.mayReceiveExternalClasses = true;
        this.context.selectionContingent = this;
        this.process();
        if(this.style_static.length)
            this.declareForStylesInclusion(recipient);
    }

    getSelectorForNestedModifier(target){
        target.stylePriority = this.stylePriority;
        return this.selector + " " + target.uniqueClassname
    }

    get selector(){
        return `${this.selectAgainst.uniqueClassname}${this.uniqueClassname}`
    }

    get path(){
        return this.selectAgainst.path.concat(`.${this.name}`)
    }

    didExitOwnScope(path){
        if(this.props.length)
            throw new Error("Props cannot be defined for a pure CSS modifier!")
        if(this.style.length)
            throw new Error("Dynamic styles cannot be defined for a pure CSS modifier!")

        this.uniqueClassname = this.name;

        this.context.pop();
    }

    includeModifier(modifier){
        // throw new Error("unexpected function called, this is an internal error")
        modifier.selectAgainst = this;
        modifier.stylePriority = 3

        this.declareForStylesInclusion(this.selectAgainst, modifier);

        const mod = this.context.nearestStyleProvider;
        if(mod) mod.provides.push(modifier);
        else this.selectAgainst.context.declare(modifier) 
        
    }

    declareForStylesInclusion(recipient, modifier){
        const noRoot = super.declareForStylesInclusion(recipient, modifier);
        if(noRoot){
            recipient.context.modifierInsertions.push(modifier || this);
        }
    }
}

class MediaQueryModifier extends ExternalSelectionModifier {
    constructor(query, body){
        super("media", body);
        this.queryString = query;
        if(this.context.modifierQuery)
            this.inherits = this.context.modifierQuery;
        this.context.modifierQuery = this;
    }

    get selector(){
        return this.selectAgainst.selector
    }

    get uniqueClassname(){
        return this.selectAgainst.uniqueClassname;
    }

    set uniqueClassname(_){}

    declare(recipient){
        this.recipient = recipient;
        this.selectAgainst = recipient;
        this.stylePriority = 5
        recipient.mayReceiveExternalClasses = true;
        this.process();
        if(this.style_static.length)
            this.declareForStylesInclusion(recipient);
    }
}