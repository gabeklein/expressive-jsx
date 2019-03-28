import t, { Expression, JSXElement, StringLiteral } from '@babel/types';
import {
    ComponentFor,
    ComponentIf,
    DoExpressive,
    ElementConstruct,
    ElementInline,
    ExplicitStyle,
    Path,
    Prop,
} from '@expressive/babel-plugin-core';
import { ArrayStack, AttributeStack } from 'attributes';
import { Attributes, ContentReact, IterateJSX, JSXContent, SwitchJSX } from 'internal';
import { createElement, createFragment, expressionValue } from 'syntax';

import { ContentJSX } from './content';

const IsLegalAttribute = /^[a-zA-Z_][\w-]*$/;
const IsLegalIdentifier = /^[a-zA-Z_]\w+$/;

function AttributeES6(src: ExplicitStyle | Prop){
    const name = src.name as string;
    const key = IsLegalIdentifier.test(name)
        ? t.identifier(name)
        : t.stringLiteral(name);
    
    return t.objectProperty(
        key, expressionValue(src)
    )
}

export class ElementJSX<T extends ElementInline = ElementInline>
    extends ElementConstruct<T>
    implements ContentReact {

    children = [] as ContentReact[];
    statements = [] as any[];
    props = [] as Attributes[];
    classList = new ArrayStack<string, Expression>()
    style = new AttributeStack<ExplicitStyle>();
    style_static = [] as ExplicitStyle[];

    constructor(public source: T){
        super();
        this.parse(true);
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

    didParse(){
        this.addInlineStyle()
            this.addClassname();
    }

    toExpression(): Expression {
        return this.toElement() as JSXElement;
    }

    toElement(): JSXContent {
        const { props, jsxChildren } = this;
        const { tagName } = this.source;

        return createElement(
            tagName || "div", 
            props, 
            jsxChildren
        );
    }

    private adopt(item: ContentReact){
        this.children.push(item)
    }

    private addInlineStyle(){
        const { style, style_static, props } = this;

        if(style_static.length)
            style.push(style_static as any);

        if(!style.length)
            return;

        let values = style.map(
            item => item instanceof ExplicitStyle
                ? expressionValue(item)
                : t.objectExpression(
                    item.map(AttributeES6)
                )
        )

        const value = values.length == 1
            ? values[0]
            : t.objectExpression(
                values.map(x => t.spreadElement(x))
            )

        props.push(t.jsxAttribute(
            t.jsxIdentifier("style"), 
            t.jsxExpressionContainer(value)
        ));
    }

    private addClassname(){
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

export class ContainerJSX<T extends ElementInline = ElementInline>
    extends ElementJSX<T> {

    replace(path: Path<DoExpressive>){
        path.replaceWith(
            this.toExpression()
        )
    }

    toElement(): JSXContent {
        const output = this.toExpression();
        if(t.isJSXElement(output))
            return output;
        else
            return t.jsxExpressionContainer(output);
    }

    toExpression(): Expression {
        const { props, children } = this;

        if(props.length == 0){
            if(children.length > 1)
                return createFragment(this.jsxChildren)
            if(children.length == 0)
                return t.booleanLiteral(false)

            return children[0].toExpression();   
        }

        return createElement(
            this.source.tagName || "div", 
            props, 
            this.jsxChildren
        );
    }
}

