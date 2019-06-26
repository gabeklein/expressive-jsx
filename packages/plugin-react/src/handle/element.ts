import {
    callExpression,
    Expression,
    isStringLiteral,
    objectExpression,
    ObjectProperty,
    SpreadElement,
    spreadElement,
    stringLiteral,
} from '@babel/types';
import {
    ComponentExpression,
    ComponentFor,
    ComponentIf,
    ContingentModifier,
    ElementConstruct,
    ElementInline,
    ElementModifier,
    ExplicitStyle,
    Prop,
    SequenceItem,
} from '@expressive/babel-plugin-core';
import { AttributeES, AttributeStack, ElementIterate, ElementSwitch, expressionValue } from 'internal';
import { ContentLike, Path, PropData, StackFrame } from 'types';

export class ElementReact<T extends ElementInline = ElementInline>
    extends ElementConstruct<T>{

    context: StackFrame
    children = [] as ContentLike[];
    props = [] as PropData[];
    classList = [] as Array<string | Expression>
    style = new AttributeStack<ExplicitStyle>();
    style_static = [] as ExplicitStyle[];

    constructor(public source: T){
        super();
        this.context = source.context as StackFrame;
        this.parse(true);
    }

    willParse(sequence: SequenceItem[]){
        const pre = [] as SequenceItem[];

        const { classList } = this.source.data;

        if(classList)
            this.classList.push(...classList);

        for(const mod of this.source.modifiers){
            if(!mod.sequence.length 
            && !mod.applicable.length)
                continue
            
            if(mod.nTargets == 1 
            && !mod.onlyWithin
            && !mod.applicable.length){
                // TODO: respect priority differences!
                const exists = this.source.style;
                for(const style of mod.sequence)
                    if(style.name in exists == false)
                        pre.push(style)
            }
            else {
                let doesProvideAStyle = false;
                const declared = this.context.Module.modifiersDeclared;
                
                for(const applicable of [mod, ...mod.applicable]){
                    if(applicable.sequence.length)
                        declared.add(applicable);

                    if(applicable instanceof ContingentModifier)
                        doesProvideAStyle = true;
                    else 

                    if(applicable instanceof ElementModifier)
                        if(applicable.sequence.length)
                            this.classList.push(applicable.uid);
                }

                if(doesProvideAStyle)
                    declared.add(mod);
            }
        }

        if(pre.length)
            return pre.concat(sequence)
    }

    didParse(){
        this.applyHoistedStyle();
        this.applyInlineStyle();
        this.applyClassname();
    }

    addProperty(
        name: string | false | undefined, 
        value: Expression){
            
        this.props.push({ name, value });
    }

    get tagName(): string {
        const { name, explicitTagName } = this.source;
        return explicitTagName || (
            name && /^[A-Z]/.test(name) ? name : "div"
        );
    }

    protected adopt(item: ContentLike){
        this.children.push(item)
    }

    private applyHoistedStyle(){
        const { style_static, context } = this;

        if(style_static.length > 0){
            const mod = new ContingentModifier(context, this.source);
            const { name, uid } = this.source;

            const classMostLikelyForwarded = 
                /^[A-Z]/.test(name!) && 
                !(this.source instanceof ComponentExpression);

            mod.priority = classMostLikelyForwarded ? 3 : 2;
            mod.sequence.push(...style_static);
            mod.forSelector = [ `.${uid}` ];
            context.Module.modifiersDeclared.add(mod);
        }
    }

    private applyInlineStyle(){
        const { style } = this;

        if(!style.length)
            return;
            
        let value: Expression;
        const [ head ] = style;

        if(style.length == 1 && head instanceof ExplicitStyle)
            value = expressionValue(head);

        else {
            const chunks = [] as (ObjectProperty | SpreadElement)[];

            for(const item of style)
                if(item instanceof ExplicitStyle)
                    chunks.push(spreadElement(expressionValue(item)))
                else
                    chunks.push(...item.map(AttributeES));
            
            value = objectExpression(chunks)
        }

        this.addProperty("style", value)
    }

    private applyClassname(){
        if(this.source.hasOwnProperty("uid"))
            this.classList.push(this.source.uid);

        if(!this.classList.length)
            return;

        const selectors = [] as Expression[]; 
        let classList = "";

        for(const item of this.classList)
            if(typeof item == "string")
                classList += " " + item;
            else
                selectors.push(item);

        if(classList)
            selectors.unshift(
                stringLiteral(classList.slice(1))
            )

        let computeClassname = selectors[0];

        if(selectors.length > 1){
            const join = this.context.Imports.ensure("@expressive/react", "join");
            computeClassname = callExpression(join, selectors)
        }

        this.addProperty("className", computeClassname)
    }

    Style(item: ExplicitStyle){
        if(item.invariant)
            this.style_static.push(item);
        else
            this.style.insert(item)
        
    }

    Props(item: Prop){
        switch(item.name){
            case "style":
                this.style.push(new ExplicitStyle(false, expressionValue(item)));
                break;

            case "className": {
                let { value } = item;

                if(!value && item.path)
                    value = item.path.node;

                if(value && typeof value == "object")
                    if(isStringLiteral(value))
                        value = value.value;
                    else {
                        this.classList.push(value);
                        break;
                    }

                if(typeof value == "string")
                    this.classList.push(value.trim());
            } break;

            default: 
                this.addProperty(item.name, expressionValue(item));
        }
    }

    Child(item: ElementInline ){
        this.adopt(new ElementReact(item));
    }

    Content(item: Path<Expression> | Expression){
        if("node" in item)
            item = item.node;

        this.adopt(item);
    }

    Switch(item: ComponentIf){
        const fork = new ElementSwitch(item)
        
        if(item.hasElementOutput)
            this.adopt(fork)

        if(item.hasStyleOutput){
            this.classList.push(
                fork.classLogic()
            );
        }
    }

    Iterate(item: ComponentFor){
        this.adopt(new ElementIterate(item))
    }

    Statement(item: any){
        void item;
    }
}