import { NodePath as Path } from '@babel/traverse';
import t, {
    JSXAttribute,
    JSXElement,
    JSXExpressionContainer,
    JSXFragment,
    JSXSpreadAttribute,
    JSXSpreadChild,
    JSXText,
    Expression,
} from '@babel/types';
import {
    AssembleElement,
    DoExpressive,
    Element,
    ElementInline,
    ExplicitStyle,
    Prop,
    SpreadItem,
    ComponentIf,
    ComponentFor,
    ComponentConsequent,
    StackFrame,
} from '@expressive/babel-plugin-core';
import { AttributeStack } from 'element';
import { createElement, createFragment } from 'syntax';

export type Content = JSXElement | JSXFragment | JSXExpressionContainer | JSXText | JSXSpreadChild;
export type Props = JSXAttribute | JSXSpreadAttribute;

class SwitchJSX {

    source: ComponentIf
    context: StackFrame;

    constructor(source: ComponentIf){
        this.source = source;
        this.context = source.parent.context;
    };

    apply(parent: ElementJSX){
        parent.children.push(
            t.jsxExpressionContainer(this.inline())
        )
    }

    inline(){
        const { children } = this.source;
        if(children.length > 1)
            return children.reduceRight(
                this.inlineReduction.bind(this), 
                t.booleanLiteral(false)
            );
        else {
            let { test, product } = this.extract(children[0]);
            
            let check: Expression = test!;

            if(check.type == "LogicalExpression")
                check = check.right;
                
            if(check.type != "BooleanLiteral" 
            && check.type != "BinaryExpression")
                check = t.unaryExpression("!", t.unaryExpression("!", check))

            return t.logicalExpression("&&", check, product);
        }
    }

    inlineReduction(alternate: Expression, current: ComponentConsequent){
        const { test, product } = this.extract(current);
        return test 
            ? t.conditionalExpression(test, product, alternate)
            : product
    }

    extract(item: ComponentConsequent): { test?: Expression, product: Expression } {
        const { test } = item;

        const product = new ContainerJSX(item).toElement()

        return {
            test: test && test.node,
            product
        };
    }
}

export class ElementJSX<From extends ElementInline = ElementInline> 
    extends AssembleElement<From> {

    children = [] as Content[];
    props = [] as Props[];
    style = new AttributeStack<ExplicitStyle>();
    statements = [] as any[];

    constructor(source: From){
        super(source);
        this.parse();
    }

    toElement(): Content {
        const { props, children } = this;
        const { tagName = "div" } = this.source;

        return createElement(
            tagName, props, children
        );
    }

    Content(item: Element){
        this.children.push(
            item instanceof ElementInline ? 
                new ElementJSX(item).toElement() :
            item.node.type == "StringLiteral" ? 
                t.jsxText(item.node.value) :
                t.jsxExpressionContainer(item.node)
        );
    }

    Switch(item: ComponentIf){
        this.children.push(
            t.jsxExpressionContainer(
                new SwitchJSX(item).inline()
            )
        )
    }

    Iterate(item: ComponentFor){
        this.children.push(
            createElement("foo-bar-loop")
        )
    }

    Props(item: Prop | SpreadItem){
        const { name, value } = item; 
        let attribute: Props;

        if(item instanceof SpreadItem){
            attribute = t.jsxSpreadAttribute(item.node);
        }
        else if(/^[a-zA-Z_][\w-]+$/.test(name)){
            attribute = t.jsxAttribute(
                t.jsxIdentifier(name), 
                typeof value == "string"
                    ? t.stringLiteral(value)
                    : t.jsxExpressionContainer(item.syntax)
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
        
    }
}

export class ContainerJSX<T extends ElementInline>
    extends ElementJSX<T> {

    replace(path: Path<DoExpressive>){
        path.replaceWith(
            this.toElement()
        )
    }

    toElement(): JSXElement | JSXFragment {
        const { props, children } = this;
        const tagName = this.source.tagName || "div";

        if(props.length == 0){
            const [ child, next ] = children;
            if(!next && t.isJSXElement(child))
                return child;
            else
                return createFragment(children)
        }

        return createElement(
            tagName, 
            props, 
            children
        );
    }
}