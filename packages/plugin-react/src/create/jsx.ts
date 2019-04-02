import t, { Expression, JSXElement } from '@babel/types';
import { Attributes, ContentExpression, ContentReact } from 'internal';

const { isArray } = Array;
const FRAGMENT = t.jsxIdentifier("Fragment");

export function createElementJSX(
    tag: string,
    props = [] as Attributes[],
    children = [] as ContentReact[]
): JSXElement {
    const type = t.jsxIdentifier(tag);
    return (
        t.jsxElement(
            t.jsxOpeningElement(type, props),
            t.jsxClosingElement(type),
            getChildrenJSX(children),
            children.length > 0
        ) 
    )
}

export function createFragmentJSX(
    children = [] as ContentReact[],
    key?: Expression | false
): JSXElement {
    const attributes = !key ? [] : [
        t.jsxAttribute(
            t.jsxIdentifier("key"), 
            t.jsxExpressionContainer(key)
        )
    ]
    
    return (
        t.jsxElement(
            t.jsxOpeningElement(FRAGMENT, attributes),
            t.jsxClosingElement(FRAGMENT),
            getChildrenJSX(children),
            false
        )
    )
}

export function getChildrenJSX(input: ContentReact[]){
    const output = [];
    for(const child of input){
        let jsx;

        if(child instanceof ContentExpression){
            const inner = child.toJSX();
            if(!isArray(inner))
                jsx = inner;
            else {
                output.push(...inner);
                break;
            }
        }
        else {
            const output = child.toExpression();
            jsx = t.isJSXElement(output)
                ? output
                : t.jsxExpressionContainer(output); 
        }

        output.push(jsx);
    }
    return output;
}