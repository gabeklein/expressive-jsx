import t, { Expression } from '@babel/types';
import { ComponentExpression, DoExpressive, ElementInline, Path } from '@expressive/babel-plugin-core';
import { BabelVisitor, JSXContent, ElementJSX } from 'internal';
import { createElement, createFragment } from 'syntax';

export const DoExpression = <BabelVisitor<DoExpressive>> {
    exit(path){
        const DoNode = path.node.meta;
        if(DoNode instanceof ComponentExpression)
            new ComponentJSX(DoNode).replace(path);
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

    toShallowContent(){
        const { props, children } = this;

        if(props.length == 0){
            if(children.length > 1)
                return createFragment(this.jsxChildren)
            if(children.length == 0)
                return t.booleanLiteral(false)

            return children[0].toExpression();   
        }
    }

    toExpression(name?: string): Expression {
        return (
            this.toShallowContent() || 
            createElement(
                name || this.source.name || "div", 
                this.props, 
                this.jsxChildren
            )
        );
    }
}

export class ComponentJSX extends ContainerJSX {
    toExpression(): Expression {
        return super.toExpression("div")
    }
}

