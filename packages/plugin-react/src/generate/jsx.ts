import t, { Expression, TemplateLiteral, Identifier } from '@babel/types';
import { PropData, ContentLike, JSXContent, ElementReact } from 'internal';
import { IsLegalAttribute } from 'types';
import { ElementSwitch } from 'handle/switch';

export class GenerateJSX {
    Fragment = t.jsxIdentifier("Fragment");

    element(
        tag: string,
        props = [] as PropData[],
        children = [] as ContentLike[]){

        const type = t.jsxIdentifier(tag);
        const properties = props.map(this.props)
    
        return (
            t.jsxElement(
                t.jsxOpeningElement(type, properties),
                t.jsxClosingElement(type),
                this.children(children),
                children.length > 0
            ) 
        )
    }
    
    props({ name, value }: PropData){
        if(typeof name !== "string")
            return t.jsxSpreadAttribute(value);
        else {
            if(IsLegalAttribute.test(name) == false)
                throw new Error(`Illegal characters in prop named ${name}`)

            const insertedValue = 
                t.isStringLiteral(value)
                    ? value
                    : t.jsxExpressionContainer(value)

            return t.jsxAttribute(
                t.jsxIdentifier(name), 
                insertedValue
            )
        }
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
                this.children(children),
                false
            )
        )
    }

    children(
        input: ContentLike[]){

        const output = [];
        for(const child of input){
            let jsx;
    
            if(t.isExpression(child)){
                if(t.isTemplateLiteral(child)){
                    output.push(...this.quasi(child))
                    continue
                }
                if(t.isStringLiteral(child))
                    jsx = t.jsxText(child.value)
                else
                    jsx = t.jsxExpressionContainer(child);
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

    container(
        src: ElementReact | ElementSwitch,
        fragmentKey?: Identifier | false
    ): Expression {

        let children: ContentLike[] | undefined;
        let props: PropData[];

        if(src instanceof ElementReact){
            children = src.children;
            props = src.props
        }
        else {
            children = [src];
            props = [];
        }

        if(fragmentKey || children.length > 1){
            return this.fragment(children, fragmentKey);
        }

        if(children.length == 0)
            return t.booleanLiteral(false);

        if(src instanceof ElementReact)
        if(props.length == 0)
            src = src.children[0] as any;
        
        if("toExpression" in src)
            return src.toExpression();

        if(t.isExpression(src))
            return src;

        throw new Error("Bad Input");
    }

    quasi(node: TemplateLiteral){
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

}