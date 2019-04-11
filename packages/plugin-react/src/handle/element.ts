import t, { Expression, ObjectProperty, SpreadElement, StringLiteral } from '@babel/types';
import {
    ComponentFor,
    ComponentIf,
    ElementConstruct,
    ElementInline,
    ExplicitStyle,
    SequenceItem,
    Prop
} from '@expressive/babel-plugin-core';
import { hash as quickHash } from 'helpers';
import {
    ArrayStack,
    AttributeStack,
    ContentLike,
    ElementIterate,
    PropData,
    StackFrameExt,
    ElementSwitch,
    AttributeES,
    expressionValue,
    callExpression
} from 'internal';
import { Path } from 'types';

export class ElementReact<T extends ElementInline = ElementInline>
    extends ElementConstruct<T>{

    context: StackFrameExt
    statements = [] as any[];
    children = [] as ContentLike[];
    props = [] as PropData[];
    classList = [] as Array<string | Expression>
    style = new AttributeStack<ExplicitStyle>();
    style_static = [] as ExplicitStyle[];

    constructor(public source: T){
        super();
        this.context = source.context as StackFrameExt;
        this.parse(true);
    }

    willParse(sequence: SequenceItem[]){
        const pre = [] as SequenceItem[];
        for(const mod of this.source.modifiers){
            if(mod.appliesTo == 1){
                pre.push(...mod.sequence);
                continue;
            }
            let c = mod.className;
            if(!c){
                const s = mod.sequence.filter(x => x instanceof ExplicitStyle);
                c = mod.className = 
                    this.context.Module.registerStyle(
                        mod, s as ExplicitStyle[]
                    )
            }
            this.classList.push(cName);
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
            reference = source.name + "_" + quickHash(source.loc);
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
        this.adopt(new ElementSwitch(item, this.context))
    }

    Iterate(item: ComponentFor){
        this.adopt(new ElementIterate(item))
    }

    Statement(item: any){
        void item;
    }
}