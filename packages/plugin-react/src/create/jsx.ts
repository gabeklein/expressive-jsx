import { Path } from '@babel/traverse';
import t, { Expression, JSXAttribute, JSXSpreadAttribute } from '@babel/types';
import { ComponentFor, ComponentIf, ElementInline } from '@expressive/babel-plugin-core';
import { Attributes, ContentExpression, ContentReact, ElementReact, IterateJSX, JSXContent, SwitchJSX } from 'internal';
import { createElement, IsLegalAttribute } from 'syntax';

const { isArray } = Array;

export class ElementJSX<T extends ElementInline = ElementInline>
    extends ElementReact<ContentReact, Attributes, T>
    implements ContentReact {

    get jsxChildren(): JSXContent[] {
        const children = [];
        for(const child of this.children){

            if(child instanceof ContentExpression){
                const inner = child.toJSX();
                if(isArray(inner)){
                    children.push(...inner);
                    break;
                }
            }

            const output = child.toExpression();

            let jsx = t.isJSXElement(output)
                ? output
                : t.jsxExpressionContainer(output);

            if(isArray(jsx))
                children.push(...jsx);
            else
                children.push(jsx);
        }
        return children;
    }

    toExpression(): Expression {
        return this.toJSX();
    }

    toJSX(){
        return createElement(
            this.tagName, 
            this.props, 
            this.jsxChildren
        );
    }

    addProperty(
        name: string | false | undefined, 
        value: Expression){

        let attr: JSXAttribute | JSXSpreadAttribute;

        if(typeof name !== "string")
            attr = t.jsxSpreadAttribute(value);
        else {
            if(IsLegalAttribute.test(name) == false)
                throw new Error(`Illegal characters in prop named ${name}`)

            const insertedValue = 
                t.isStringLiteral(value)
                    ? value
                    : t.jsxExpressionContainer(value)

            attr = t.jsxAttribute(
                t.jsxIdentifier(name), 
                insertedValue
            )
        }
        
        this.props.push(attr);
    }

    Child(item: ElementInline ){
        this.adopt(new ElementJSX(item));
    }

    Content(item: Path<Expression> | Expression){
        this.adopt(new ContentExpression(item));
    }

    Switch(item: ComponentIf){
        this.adopt(new SwitchJSX(item))
    }

    Iterate(item: ComponentFor){
        this.adopt(new IterateJSX(item))
    }
}