import { Identifier, Statement } from '@babel/types';
import { createHash } from 'crypto';
import t, { AttributeBody, ElementInline, ensureUIDIdentifier, Opts, Shared, StackFrame } from 'internal';
import { BunchOf, Path, Scope } from 'types';

interface ModifierOutput {
    attrs?: BunchOf<any>
    style?: BunchOf<any>
    props?: BunchOf<any>
    installed_style?: (ElementModifier | ElementInline)[]
}

type SideEffect = (...args: any[]) => void;

export class ElementModifier extends AttributeBody {
    // classList = [] as string[];
    precedence = 0
    provides = [] as ElementModifier[];
    operations = [] as SideEffect[];
    inlineType = "stats"
    stylePriority = 1
    id?: Identifier;
    uid?: string
    styleID?: Identifier;

    name: string;
    body: Path<Statement>;
    scope: Scope;
    inherits?: ElementModifier;
    selectAgainst?: ElementModifier | ElementInline; 
    mayReceiveExternalClasses?: true;
    hash?: string;

    constructor(name: string, context: StackFrame, body: Path<Statement>){
        super(context);
        this.name = name;
        this.body = body;

        // if(Shared.stack.styleMode.compile)
        //     this.style_static = [];

        Shared.stack.push(this);
        this.scope = body.scope;

        if(typeof this.didEnter == "function")
            this.didEnter(body);
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

    // declare(recipient: AttrubuteBody){
    //     this.context.nearestStyleProvider = this;
    //     this.process();
    //     recipient.includeModifier(this);
    // }

    onComponent(f: SideEffect){
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
        if(this.hasStaticStyle && this.context.styleMode.compile){
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

        if(this.style_static)
            this.hash = createHash("md5")
                .update(this.style_static.reduce((x,y) => x + y.asString, ""))
                .digest('hex')
                .substring(0, 6);

        this.context.pop();

        if(this.context.styleMode.compile){
            let { name, hash } = this;
            let uid = this.uid = `${name}-${hash}`
            this.uniqueClassname = "." + this.uid;

            if(Opts.reactEnv == "native")
                this.styleID = t.identifier(uid.replace("-", "_"))
        }
    }

    // insert(
    //     target: AttrubuteBody, 
    //     args: any[], 
    //     inline: ModifierOutput ){

    //     for(const op of this.operations)
    //         op(target, inline)
    //     if(!inline && !args.length) return;
    //     this.into(inline)
    // }

    output(){
        let { props, style } = this;
        let declaration;

        const propsObject = props.length 
            ? t.objectExpression(props.map(x => x.toProperty)) 
            : undefined;

        const styleObject = style.length 
            ? t.objectExpression(style.map(x => x.asProperty)) 
            : undefined;

        declaration = 
            propsObject && styleObject
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
        if(this.hasStaticStyle)
            inline.installed_style!.push(this)
            
        if(this.inherits) 
            this.inherits.into(inline);

        const { style, props } = this;
        
        if(!style.length && !props.length) return

        const id = this.id || (this.id = this.scope.generateUidIdentifier(this.name) as any); 

        if(props.length && style.length){
            inline.props!.push(t.spreadElement(
                t.memberExpression(
                    id as any, 
                    t.identifier("props")
                )
            ))
            inline.style!.push(t.spreadElement(
                t.memberExpression(
                    id as any, 
                    t.identifier("style")
                )
            ))
        }
        else {
            (inline as any)[style.length ? "style" : "props"].push(
                t.spreadElement(id as any)
            );
        }

        // for(const name of this.classList)
        //     if(typeof name == "string")
        //         if(target.classList.indexOf(name) < 0)
        //             target.classList.push(name);
    }
}