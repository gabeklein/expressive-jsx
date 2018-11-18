import * as t from "@babel/types";
import { LabeledStatement, Identifier, Statement} from "@babel/types";
import { NodePath as Path, Scope } from "@babel/traverse";
import { AttrubutesBody } from "./component";
import { createHash } from 'crypto';
import { SyntheticProp, ExplicitStyle } from "./item";
import { parsedArguments } from "./attributes";
import { Opts, Shared, ensureUIDIdentifier, toArray} from "./shared";
import { StackFrame } from "./scope";
import { ElementInline } from "./inline";
import { ComponentConsequent } from "./ifstatement";

interface ModifierOutput {
    attrs?: { [name: string]: any }
    style?: { [name: string]: any }
    props?: { [name: string]: any }
    installed_style?: (ElementModifier | ElementInline)[]
}

type ModifyAction = (this: ModifyDelegate) => ModifierOutput;

type anyfunction = (...args: any[]) => void;

interface ModifierRecipient {
    context: StackFrame;
    includeModifier(mod: ElementModifier): void;
}

export class GeneralModifier {

    name: string;
    transform?: ModifyAction;

    constructor(name: string, transform?: ModifyAction){
        this.name = name;
        if(transform)
            this.transform = transform;
    }

    static applyTo(recipient: AttrubutesBody, src: Path<LabeledStatement>) {
        const name = src.node.label.name;
        const body = src.get("body") as Path<Statement>;
    
        const modifier = 
            recipient.context.propertyMod(name) || new this(name);
    
        modifier.apply(body, recipient);
    }
    
    apply(
        body: Path<Statement>, 
        target: AttrubutesBody
    ){
        const accumulated = { 
            props: {}, 
            style: {}
        };

        type ModTuple = [GeneralModifier, any];
        
        let i = 0;
        let mod: GeneralModifier = this;
        let mods = [] as ModTuple[];

        while(true){
            let { data: delegateOutput } = 
                new ModifyDelegate(mod, body, target);

            if(!delegateOutput){
                i++; continue; 
            }

            Object.assign(accumulated.style, delegateOutput.style);
            Object.assign(accumulated.props, delegateOutput.props);

            const next = delegateOutput.attrs || true;
            const pending = [] as ModTuple[];

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
    
                pending.push([
                    context.propertyMod(named) || new GeneralModifier(named), 
                    value
                ])
            }
            
            if(!pending.length)
                if(mods[++i])
                    [mod, body] = mods[i]
                else break;
            else {
                mods = pending.concat(mods.slice(i+1));
                [mod, body] = mods[i = 0];
            }
        }

        this.integrate(target, accumulated);
    }

    integrate(
        target: AttrubutesBody, 
        { style, props } : { style: any; props: any} 
    ){
        for(const name in style)
            if(style[name] !== null)
                target.add(
                    new ExplicitStyle(name, style[name])
                )

        for(const name in props)
            if(props[name] !== null)
                target.add(
                    new SyntheticProp(name, props[name])
                )
    }
}

function invokeModifierDefault(this: ModifyDelegate){
    if(!this.body || this.body.type == "ExpressionStatement")
        return propertyModifierDefault.call(this)
    else 
        return elementModifierDefault.call(this)
}

function elementModifierDefault(this: ModifyDelegate){
    new ElementModifier(this.name, this.body!).declare(this.target);
    return null;
}

function propertyModifierDefault(this: ModifyDelegate) {
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

export class ModifyDelegate {

    target: any;
    name: string;
    body?: Path<Statement>;
    priority?: number;
    data: {
        [name: string]: any;
    };
    done?: true;

    constructor(
        mod: GeneralModifier, 
        body: Path<Statement>, 
        target: AttrubutesBody
    ){
        let { transform } = mod;
        if(!transform || transform.length > 0 && body.type == "BlockStatement")
            transform = invokeModifierDefault;

        this.target = target;
        this.data = {};
        this.name = mod.name;

        if(!body.type)
            Object.defineProperty(this, "arguments", { value: toArray(body) })
        else 
            this.body = body;

        let initialArguments = transform.length > 0 ? this.arguments : [];
            initialArguments = Array.isArray(initialArguments) ? initialArguments : [initialArguments]
        const transformOutput = transform.apply(this, initialArguments);

        if(this.done || transformOutput === null) return;

        if(transformOutput)
            this.assign(transformOutput)
    }

    get arguments(): any[] {

        const args = new parsedArguments(this.body).args;

        // const { context } = this.target;

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

    assign(data: any){
        for(const field in data)
            if(this.data[field])
                Object.assign(this.data[field], data[field])
            else this.data[field] = data[field]
    }

    declareElementModifier(
        name: string, 
        body: Path<t.LabeledStatement>, 
        fn?: (() => void) | undefined
    ){
        const mod = new ExternalSelectionModifier(name, body, fn);
        if(this.priority) mod.stylePriority = this.priority;
        mod.declare(this.target);
    }

    declareMediaQuery(
        query: string, 
        body: Path<t.LabeledStatement>
    ){
        new MediaQueryModifier(query, body).declare(this.target)
    }

    parse(ast: any){
        return new parsedArguments(ast).args
    }
}

export class ElementModifier extends AttrubutesBody {

    precedence = 0
    classList = [] as string[];
    provides = [] as ElementModifier[];
    operations = [] as anyfunction[];
    opperations = [];
    inlineType = "stats"
    stylePriority = 1

    name: string;
    body: Path<Statement>;
    scope: Scope;
    inherits?: ElementModifier;
    selectAgainst?: ElementModifier | ElementInline;
    type?: "style" | "props" | "both";
    hash?: string;
    id?: Identifier;
    uid?: string
    styleID?: Identifier;
    mayReceiveExternalClasses?: true;

    constructor(name: string, body: Path<Statement>){
        super()
        this.name = name;
        this.body = body;

        if(Shared.stack.styleMode.compile)
            this.style_static = [];

        Shared.stack.push(this);
        this.scope = body.scope;

        if(typeof this.init == "function")
            this.init(body);
    }  

    computeStyles(){
        return t.objectProperty(
            t.stringLiteral(this.selector || this.uniqueClassname!), 
            // t.objectExpression(this.compileStyleObject)
            t.stringLiteral(this.compiledStyle)
        )
    }

    get selector(){
        if(this.context.selectionContingent)
            return this.context.selectionContingent.getSelectorForNestedModifier(this);
        else return this.uniqueClassname;
    }

    get path(): string[] {
        if(this.selectAgainst)
            return (this.selectAgainst as any).path.concat(` ${this.uniqueClassname}`)
        else return [ this.uniqueClassname! ];
    }

    declare(recipient: ModifierRecipient){
        this.context.nearestStyleProvider = this;
        this.process();
        recipient.includeModifier(this);
    }

    onComponent(f: anyfunction){
        this.operations.push(f);
    }

    includeModifier(modifier: ElementModifier){
        this.provides.push(modifier)
        if(this.selectAgainst){
            modifier.selectAgainst = this.selectAgainst;
            modifier.stylePriority = 3
            modifier.declareForStylesInclusion(this.selectAgainst.parent)
        }
        else
        modifier.declareForComponent(this.context.current)
    }

    declareForStylesInclusion(recipient: ElementModifier | ElementInline, modifier = this): boolean {
       return !!recipient.context.declareForRuntime(modifier);
    }

    declareForComponent(recipient: ElementModifier | ElementInline){
        if(this.context.styleMode.compile && this.style_static.length){
            // this.contextParent = recipient;
            recipient.add(this);
            const noRoot = this.declareForStylesInclusion(recipient);
            if(noRoot){
                recipient.context.modifierInsertions.push(this);
            }
        } else {
            if(this.context.currentElement)
                this.context.currentElement.add(this);
        }
    }

    declareForConditional(recipient: ComponentConsequent){
        if(this.context.styleMode.compile){
            this.selectAgainst = this.parent;
            this.stylePriority = 3
            this.declareForStylesInclusion(recipient.parent);
        }
    }

    process(){
        let { body } = this;

        const traversable = 
            body.type == "BlockStatement" ? body.get("body") :
            body.type == "LabeledStatement" && [body];

        for(const item of traversable as Path<Statement>[])
            if(item.type in this) 
                (this as any)[item.type](item);
            else throw item.buildCodeFrameError(`Unhandled node ${item.type}`)

        this.didExitOwnScope(this.body)
    }

    didExitOwnScope(path: Path<Statement>){
        if(this.props.length)
            this.type = "props"
        if(this.style.length)
            this.type = this.type ? "both" : "style"
        if(this.style_static)
            this.hash = createHash("md5")
                .update(this.style_static.reduce((x,y) => x + y.asString, ""))
                .digest('hex')
                .substring(0, 6);
        
        super.didExitOwnScope(path);

        if(this.context.styleMode.compile){
            let { name, hash } = this;
            let uid = this.uid = `${name}-${hash}`
            this.uniqueClassname = "." + this.uid;

            if(Opts.reactEnv == "native")
                this.styleID = t.identifier(uid.replace("-", "_"))
        }
    }

    insert(
        target: ModifierRecipient, 
        args: any[], 
        inline: ModifierOutput
    ){
        for(const op of this.operations)
            op(target, inline)
        if(!inline && !args.length) return;
        this.into(inline)
    }

    output(){
        let { props, style } = this;
        let declaration;

        const propsObject = props.length ? t.objectExpression(props.map(x => x.asProperty)) : undefined;
        const styleObject = style.length ? t.objectExpression(style.map(x => x.asProperty)) : undefined;

        declaration = 
            ( this.type == "both" )
            ? t.objectExpression([
                t.objectProperty(t.identifier("props"), propsObject!),
                t.objectProperty(t.identifier("style"), styleObject!)
            ]) 
            : propsObject || styleObject;

        if(declaration) {
            const id = this.id || (this.id = ensureUIDIdentifier.call(this.scope, this.name)); 
            return t.variableDeclaration("const", [
                t.variableDeclarator(
                    id, declaration
                )
            ])
        }
    }

    into(inline: ModifierOutput, /*target: ElementModifier*/){
        if(this.style_static !== this.style && this.style_static.length)
            inline.installed_style!.push(this)
            
        if(this.inherits) 
            this.inherits.into(inline);
        
        if(!this.style.length && !this.props.length) return

        const { style, props } = inline;
        const id = this.id || (this.id = this.scope.generateUidIdentifier(this.name) as any); 

        if(this.props.length && this.style.length){
            props!.push(t.spreadElement(
                t.memberExpression(
                    id as any, 
                    t.identifier("props")
                )
            ))
            style!.push(t.spreadElement(
                t.memberExpression(
                    id as any, 
                    t.identifier("style")
                )
            ))
        }
        else {
            (inline as any)[this.type!].push(
                t.spreadElement(id as any)
            );
        }

        // for(const name of this.classList)
        //     if(typeof name == "string")
        //         if(target.classList.indexOf(name) < 0)
        //             target.classList.push(name);
    }
}

class ExternalSelectionModifier extends ElementModifier {
    inlineType = "none"
    transform?: () => void
    recipient?: ElementModifier | ElementInline;
    
    constructor(name: string, body: Path<LabeledStatement>, fn?: () => void){
        super(name, body);
        if(fn)
            this.transform = fn;
        this.stylePriority = 5
    }

    declare(recipient: ElementModifier | ElementInline){
        this.recipient = recipient;
        this.selectAgainst = recipient;
        recipient.mayReceiveExternalClasses = true;
        this.context.selectionContingent = this;
        this.process();
        if(this.style_static.length)
            this.declareForStylesInclusion(recipient);
    }

    getSelectorForNestedModifier(target: ElementModifier){
        target.stylePriority = this.stylePriority;
        return this.selector + " " + target.uniqueClassname
    }

    get selector(): string{
        const parent = this.selectAgainst;
        const ucn = this.uniqueClassname;
        let parentName = parent instanceof ExternalSelectionModifier 
            ? parent.selector
            : parent!.uniqueClassname;

        return ucn == "::both"
            ? `${parentName}::before, ${parentName}::after`
            : `${parentName}${ucn}`;
    }

    get path(){
        return (this.selectAgainst as any).path.concat(`.${this.name}`)
    }

    didExitOwnScope(){
        if(this.props.length)
            throw new Error("Props cannot be defined for a pure CSS modifier!")
        if(this.style.length)
            throw new Error("Dynamic styles cannot be defined for a pure CSS modifier!")

        this.uniqueClassname = this.name;

        this.context.pop();
    }

    includeModifier(this: ElementModifier, modifier: ElementModifier){
        // throw new Error("unexpected function called, this is an internal error")
        modifier.selectAgainst = this;
        modifier.stylePriority = 3

        this.declareForStylesInclusion(this.selectAgainst!, modifier);

        const mod = this.context.nearestStyleProvider;
        if(mod) mod.provides.push(modifier);
        else this.selectAgainst!.context.declare(modifier) 
        
    }

    declareForStylesInclusion(recipient: ElementModifier | ElementInline, modifier = this){
        const noRoot = super.declareForStylesInclusion(recipient, modifier);
        if(noRoot){
            recipient.context.modifierInsertions.push(modifier);
        }
        return false;
    }
}

class MediaQueryModifier extends ExternalSelectionModifier {

    queryString: string;
    recipient?: ElementModifier | ElementInline;

    constructor(query: string, body: Path<LabeledStatement>){
        super("media", body);
        this.queryString = query;
        if(this.context.modifierQuery)
            this.inherits = this.context.modifierQuery;
        this.context.modifierQuery = this;
    }

    get selector(){
        return this.selectAgainst!.selector
    }

    get uniqueClassname(){
        return this.selectAgainst!.uniqueClassname;
    }

    set uniqueClassname(_){}

    declare(recipient: ElementModifier | ElementInline){
        this.recipient = recipient;
        this.selectAgainst = recipient;
        this.stylePriority = 5
        recipient.mayReceiveExternalClasses = true;
        this.process();
        if(this.style_static.length)
            this.declareForStylesInclusion(recipient);
    }
}