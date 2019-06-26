import {
    Expression,
    isExpression,
    isJSXElement,
    isStringLiteral,
    isTemplateLiteral,
    jsxAttribute,
    jsxClosingElement,
    jsxElement,
    jsxExpressionContainer,
    jsxIdentifier,
    jsxOpeningElement,
    jsxSpreadAttribute,
    jsxText,
    stringLiteral,
    TemplateLiteral,
} from '@babel/types';
import { ElementReact, GenerateReact } from 'internal';
import { ContentLike, IsLegalAttribute, JSXContent, PropData } from 'types';

export class GenerateJSX extends GenerateReact {
    
    get Fragment(){
        const Fragment = jsxIdentifier(
            this.external.ensure("react", "Fragment").name
        );
        Object.defineProperty(this, "Fragment", { configurable: true, value: Fragment })
        return Fragment;
    }
    
    willExitModule(){
        if(this.module.lastInsertedElement)
            this.external.ensure("react", "default", "React")
    }

    element(src: ElementReact){
            
        const {
            tagName: tag,
            props,
            children
        } = src;

        const type = jsxIdentifier(tag);
        const properties = props.map(this.recombineProps)
    
        return (
            jsxElement(
                jsxOpeningElement(type, properties),
                jsxClosingElement(type),
                this.recombineChildren(children),
                children.length > 0
            ) 
        )
    }

    fragment(
        children = [] as ContentLike[],
        key?: Expression | false
    ){
        const attributes = !key ? [] : [
            jsxAttribute(
                jsxIdentifier("key"), 
                jsxExpressionContainer(key)
            )
        ]
        
        return (
            jsxElement(
                jsxOpeningElement(this.Fragment, attributes),
                jsxClosingElement(this.Fragment),
                this.recombineChildren(children),
                false
            )
        )
    }

    private recombineChildren(
        input: ContentLike[]){
    
        const output = [] as JSXContent[];
        for(const child of input){
            let jsx;
    
            if(isJSXElement(child))
                jsx = child
            else if(isExpression(child)){
                if(isTemplateLiteral(child)){
                    output.push(...this.recombineQuasi(child))
                    continue
                }
                if(isStringLiteral(child) 
                && child.value.indexOf("{") < 0
                && input.length == 1)
                    jsx = jsxText(child.value)
                else
                    jsx = jsxExpressionContainer(child);
            }
            else {
                jsx = "toExpression" in child
                    ? jsxExpressionContainer(child.toExpression(this))
                    : this.element(child)
            }
    
            output.push(jsx);
        }
    
        return output;
    }
    
    private recombineQuasi(node: TemplateLiteral){
        const { expressions, quasis } = node;
        const acc = [] as JSXContent[];
        let i = 0;
    
        while(true) {
            const value = quasis[i].value.cooked as string;
            if(value)
                acc.push( 
                    value.indexOf("{") < 0
                        ? jsxText(value)
                        : jsxExpressionContainer(stringLiteral(value))
                )
    
            if(i in expressions)
                acc.push(
                    jsxExpressionContainer(
                        expressions[i++]))
            else break;
        }
    
        return acc;
    }
    
    private recombineProps({ name, value }: PropData){
        if(typeof name !== "string")
            return jsxSpreadAttribute(value);
        else {
            if(IsLegalAttribute.test(name) == false)
                throw new Error(`Illegal characters in prop named ${name}`)
    
            const insertedValue = 
                isStringLiteral(value)
                    ? value.value == "true"
                        ? null
                        : value
                    : jsxExpressionContainer(value)
    
            return jsxAttribute(
                jsxIdentifier(name), 
                insertedValue
            )
        }
    }
}