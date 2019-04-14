import t, { Expression, ObjectProperty, SpreadElement } from '@babel/types';
import {
    ComponentFor,
    ComponentIf,
    ElementConstruct,
    ElementInline,
    ExplicitStyle,
    Prop,
    SequenceItem,
} from '@expressive/babel-plugin-core';
import { AttributeES, AttributeStack, ElementIterate, ElementSwitch, expressionValue } from 'internal';
import { Path, PropData, StackFrame, ContentLike } from 'types';

export class ElementReact<T extends ElementInline = ElementInline>
    extends ElementConstruct<T>{

    context: StackFrame
    statements = [] as any[];
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

        for(const mod of this.source.modifiers){
            if(mod.appliesTo == 1){
                const exists = this.source.style;
                for(const style of mod.sequence)
                    if(style.name in exists == false)
                        pre.push(style)
                continue;
            }
            let className = mod.className;
            if(!className){
                const staticStyles = mod.sequence.filter(x => x instanceof ExplicitStyle);
                className = mod.className = 
                    this.context.Module.registerStyle(
                        mod, staticStyles as ExplicitStyle[]
                    )
            }
            if(mod.appliesTo !== -1)
                this.classList.push(className);
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
        return explicitTagName || name || "div";
    }

    protected adopt(item: ContentLike){
        this.children.push(item)
    }

    private applyHoistedStyle(){
        const { source, style_static } = this;
        let reference;

        if(style_static.length > 0)
            reference = this.context.Module.registerStyle(source, style_static);
        else if(source.doesHaveContingentStyle)
            reference = source.uid;
        else
            return;

        this.classList.push(reference);
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
                    chunks.push(t.spreadElement(expressionValue(item)))
                else
                    chunks.push(...item.map(AttributeES));
            
            value = t.objectExpression(chunks)
        }

        this.addProperty("style", value)
    }

    private applyClassname(){

        const join = this.context.Imports.ensure("@expressive/react", "join");

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
                t.stringLiteral(classList.slice(1))
            )

        this.addProperty("className", 
            selectors.length == 1
                ? selectors[0]
                : t.callExpression(
                    join, selectors
                )
        )
    }

    Props(item: Prop){
        this.addProperty(item.name, expressionValue(item));
    }

    Style(item: ExplicitStyle){
        if(item.invariant)
            this.style_static.push(item as ExplicitStyle);
        else
            this.style.insert(item)
    }

    Attribute(item: Prop | ExplicitStyle): boolean | undefined {
        if(item instanceof ExplicitStyle)
            return;

        switch(item.name){
            case "style":
                this.style.push(new ExplicitStyle(false, expressionValue(item)));
                break;

            case "className": {
                let { value } = item;

                if(!value && item.path)
                    value = item.path.node;

                if(value && typeof value == "object")
                    if(t.isStringLiteral(value))
                        value = value.value;
                    else {
                        this.classList.push(value);
                        break;
                    }

                if(typeof value == "string")
                    this.classList.push(value.trim());
            } break;

            default:
                return;
        }

        return true;
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
            this.source.doesHaveContingentStyle = true
        }
    }

    Iterate(item: ComponentFor){
        this.adopt(new ElementIterate(item))
    }

    Statement(item: any){
        void item;
    }
}