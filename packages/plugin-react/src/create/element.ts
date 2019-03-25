import t, { Expression, JSXElement } from '@babel/types';
import {
    AssembleElement,
    ComponentFor,
    ComponentIf,
    DoExpressive,
    ElementInline,
    ExplicitStyle,
    Path,
    Prop,
    SpreadItem,
} from '@expressive/babel-plugin-core';
import { AttributeStack } from 'attributes';
import { createElement, createFragment } from 'syntax';
import { Attributes, JSXContent, ContentReact, SwitchJSX, IterateJSX } from 'internal';

const IsLegalAttribute = /^[a-zA-Z_][\w-]*$/;

export class ContentJSX implements ContentReact {
    node: Expression;
    path?: Path<Expression>
    
    constructor(
        source: Path<Expression> | Expression ){

        const path = source as Path<Expression>;
        if(path.node){
            this.path = path;
            this.node = path.node;
        }
        else 
            this.node = source as Expression;
    }

    toExpression(): Expression {
        return t.identifier("undefined")
    }

    toElement(){
        const { node } = this;
        return t.isStringLiteral(node) ? 
            t.jsxText(node.value) :
            t.jsxExpressionContainer(node)
    }
}

export class ElementJSX<T extends ElementInline = ElementInline>
    extends ElementConstruct<T>
    implements ContentReact {

    children = [] as ContentReact[];
    statements = [] as any[];
    props = [] as Attributes[];
    style = new AttributeStack<ExplicitStyle>();

    constructor(public source: T){
        super();
        this.parse();
    }

    get jsxChildren(): JSXContent[] {
        return this.children.map(x => x.toElement())
    }

    add(item: ContentReact){
        this.children.push(item)
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

    Child(item: ElementInline ){
        this.add(new ElementJSX(item));
    }

    Content(item: Path<Expression> | Expression){
        this.add(new ContentJSX(item));
    }

    Switch(item: ComponentIf){
        this.add(new SwitchJSX(item))
    }

    Iterate(item: ComponentFor){
        this.add(new IterateJSX(item))
    }

    Props(item: Prop | SpreadItem){
        let { name, value } = item;
        let attribute: Attributes;

        let expression = 
            value === undefined ?
                item.path!.node :
            typeof value === "object" ?
                value || t.nullLiteral() :
            typeof value === "number" ?
                t.numericLiteral(value) :
            typeof value === "boolean" ?
                t.booleanLiteral(value) : 
                t.stringLiteral(value);
            
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

    Style(item: ExplicitStyle | SpreadItem){
        // this.style.insert(item);
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

