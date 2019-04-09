import t, { Expression, TemplateLiteral, JSXElement } from '@babel/types';
import { ContentLike, GenerateReact, JSXContent, PropData } from 'internal';
import { IsLegalAttribute } from 'types';
import { ElementReact } from 'handle/element';

export class GenerateJSX extends GenerateReact {
    
    get Fragment(){
        const Fragment = t.jsxIdentifier(
            this.external.ensure("react", "Fragment").name
        );
        Object.defineProperty(this, "Fragment", { configurable: true, value: Fragment })
        return Fragment;
    }
    
    willExitModule(){
        if(this.module.lastInsertedElement)
            this.external.ensure("react", "default", "React")
    }

    element(src: ElementReact): JSXElement {
            
        const {
            tagName: tag,
            props,
            children
        } = src;

        const type = t.jsxIdentifier(tag);
        const properties = props.map(this.recombineProps)
    
        return (
            t.jsxElement(
                t.jsxOpeningElement(type, properties),
                t.jsxClosingElement(type),
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
            t.jsxAttribute(
                t.jsxIdentifier("key"), 
                t.jsxExpressionContainer(key)
            )
        ]
        
        return (
            t.jsxElement(
                t.jsxOpeningElement(this.Fragment, attributes),
                t.jsxClosingElement(this.Fragment),
                this.recombineChildren(children),
                false
            )
        )
    }

    private recombineChildren(
        input: ContentLike[]){
    
        const output = [];
        for(const child of input){
            let jsx;
    
            if(t.isExpression(child)){
                if(t.isTemplateLiteral(child)){
                    output.push(...this.recombineQuasi(child))
                    continue
                }
                if(t.isStringLiteral(child))
                    jsx = t.jsxText(child.value)
                else
                    jsx = t.jsxExpressionContainer(child);
            }
            else {
                jsx = "toExpression" in child
                    ? t.jsxExpressionContainer(child.toExpression())
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
                    t.jsxText(value))
    
            if(i in expressions)
                acc.push(
                    t.jsxExpressionContainer(
                        expressions[i++]))
            else break;
        }
    
        return acc;
    }
    
    private recombineProps({ name, value }: PropData){
        if(typeof name !== "string")
            return t.jsxSpreadAttribute(value);
        else {
            if(IsLegalAttribute.test(name) == false)
                throw new Error(`Illegal characters in prop named ${name}`)
    
            const insertedValue = 
                t.isStringLiteral(value)
                    ? value.value == "true"
                        ? null
                        : value
                    : t.jsxExpressionContainer(value)
    
            return t.jsxAttribute(
                t.jsxIdentifier(name), 
                insertedValue
            )
        }
    }
}