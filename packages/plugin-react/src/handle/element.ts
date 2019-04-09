import t, { Expression, ObjectProperty, SpreadElement, StringLiteral } from '@babel/types';
import {
    ComponentFor,
    ComponentIf,
    ElementConstruct,
    ElementInline,
    ExplicitStyle,
    Prop
} from '@expressive/babel-plugin-core';
import {
    ArrayStack,
    AttributeStack,
    ContentLike,
    ElementIterate,
    PropData,
    StackFrameExt,
    ElementSwitch,
    AttributeES,
    expressionValue
} from 'internal';
import { Path } from 'types';

export class ElementReact<T extends ElementInline = ElementInline>
    extends ElementConstruct<T>{

    context: StackFrameExt
    statements = [] as any[];
    children = [] as ContentLike[];
    props = [] as PropData[];
    classList = new ArrayStack<string, Expression>()
    style = new AttributeStack<ExplicitStyle>();
    style_static = [] as ExplicitStyle[];

    constructor(public source: T){
        super();
        this.context = source.context as StackFrameExt;
        this.parse(true);
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
        const { style, style_static } = this;

        if(style_static.length == 0)
            return

        if(void 0){
            style.push(style_static as any);
            return;
        }

        const context = this.context as StackFrameExt;

        const reference = context.Module.registerStyle(this.source, style_static);

        if(typeof reference == "string")
            this.classList.insert(reference);
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
        if(!this.classList.length)
            return;

        const classes = this.classList.map(x => {
            return Array.isArray(x)
                ? t.stringLiteral(x.join(" "))
                : x
        })

        let classNameValue = 
            classes.length == 1
                ? classes[0] as StringLiteral
                : t.callExpression(
                    t.memberExpression(
                        t.arrayExpression(classes),
                        t.identifier("join")
                    ), [
                        t.stringLiteral(" ")
                    ]
                )

        this.addProperty("className", classNameValue)
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
                    for(const name of value.split(" "))
                        this.classList.insert(name);
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