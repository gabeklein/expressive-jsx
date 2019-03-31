import { Path } from '@babel/traverse';
import t, { Expression, JSXElement, ObjectProperty, SpreadElement, StringLiteral } from '@babel/types';
import {
    ComponentFor,
    ComponentIf,
    ElementConstruct,
    ElementInline,
    ExplicitStyle,
    Prop,
    StackFrame,
} from '@expressive/babel-plugin-core';
import { ArrayStack, AttributeStack } from 'attributes';
import { Attributes, ContentReact, IterateJSX, JSXContent, SwitchJSX, StackFrameExt } from 'internal';
import { createElement, expressionValue, AttributeES6, IsLegalAttribute } from 'syntax';

import { ContentJSX } from './content';

export class ElementJSX<T extends ElementInline = ElementInline>
    extends ElementConstruct<T>
    implements ContentReact {

    context: StackFrame
    children = [] as ContentReact[];
    statements = [] as any[];
    props = [] as Attributes[];
    classList = new ArrayStack<string, Expression>()
    style = new AttributeStack<ExplicitStyle>();
    style_static = [] as ExplicitStyle[];

    constructor(public source: T){
        super();
        this.context = source.context;
        this.parse(true);
    }

    didParse(){
        this.applyHoistedStyle();
        this.applyInlineStyle();
        this.applyClassname();
    }

    toExpression(): Expression {
        return this.toElement() as JSXElement;
    }

    toElement(): JSXContent {
        const { props, jsxChildren } = this;
        const { name } = this.source;

        return createElement(
            name || "div", 
            props, 
            jsxChildren
        );
    }

    get jsxChildren(): JSXContent[] {
        const children = [];
        for(const child of this.children){
            const jsx = child.toElement();
            if(Array.isArray(jsx))
                children.push(...jsx);
            else
                children.push(jsx);
        }
        return children;
    }

    private adopt(item: ContentReact){
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

        const reference = context.Module.registerStyle(context, style_static);

        if(typeof reference == "string")
            this.classList.insert(reference);
    }

    private applyInlineStyle(){
        const { style, props } = this;

        if(!style.length)
            return;
            
        let value: Expression;
        const [ head ] = style;

        if(style.length == 1 && head instanceof ExplicitStyle)
            value = expressionValue(head);

        else {
            const stuff = [] as (ObjectProperty | SpreadElement)[];

            for(const item of style)
                if(item instanceof ExplicitStyle)
                    stuff.push(t.spreadElement(expressionValue(item)))
                else
                    stuff.push(...item.map(AttributeES6));
            
            value = t.objectExpression(stuff)
        }

        props.push(t.jsxAttribute(
            t.jsxIdentifier("style"), 
            t.jsxExpressionContainer(value)
        ));
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
                : t.jsxExpressionContainer(
                    t.callExpression(
                        t.memberExpression(
                            t.arrayExpression(classes),
                            t.identifier("join")
                        ), [
                            t.stringLiteral(" ")
                        ]
                    )
                )

        this.props.push(t.jsxAttribute(
            t.jsxIdentifier("className"), 
            classNameValue
        ));
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

    Style(item: ExplicitStyle){
        if(item.invariant)
            this.style_static.push(item as ExplicitStyle);
        else
            this.style.insert(item)
    }

    Props(item: Prop){
        let { name } = item;
        let attribute: Attributes;

        const expression = expressionValue(item);
            
        if(!name)
            attribute = t.jsxSpreadAttribute(expression);
        
        else if(IsLegalAttribute.test(name)){
            attribute = t.jsxAttribute(
                t.jsxIdentifier(name), 
                expression.type == "StringLiteral"
                    ? expression
                    : t.jsxExpressionContainer(expression)
            )
        }
        else 
            throw new Error(`Illegal characters in prop named ${name}`)

        this.props.push(attribute);
    }

    Child(item: ElementInline ){
        this.adopt(new ElementJSX(item));
    }

    Content(item: Path<Expression> | Expression){
        this.adopt(new ContentJSX(item));
    }

    Switch(item: ComponentIf){
        this.adopt(new SwitchJSX(item))
    }

    Iterate(item: ComponentFor){
        this.adopt(new IterateJSX(item))
    }

    Statement(item: any){
        void item;
    }
}