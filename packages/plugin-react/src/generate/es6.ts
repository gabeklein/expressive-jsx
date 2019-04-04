import t, { Expression, Identifier, MemberExpression, ObjectProperty, StringLiteral } from '@babel/types';
import { ElementReact, PropData, ContentLike, ArrayStack } from 'internal';
import { isIdentifierElement, IsLegalIdentifier } from 'types';

const { isArray } = Array;

export class GenerateES {

    Factory = t.identifier("create");
    Fragment = t.identifier("Fragment")

    get Assign(){
        return t.identifier("assign")
    }

    element(
        tag: string | Identifier | StringLiteral | MemberExpression,
        props = [] as PropData[],
        children = [] as ContentLike[]){

        if(typeof tag == "string")
            tag = isIdentifierElement.test(tag)
                ? t.identifier(tag)
                : t.stringLiteral(tag)

        return t.callExpression(this.Factory, [
            tag, 
            this.props(props), 
            ...this.children(children)
        ]);
    }

    props(
        props: PropData[]){
        
        if(props.length == 1 && !props[0].name)
            return props[0].value;
            
        const chunks = new ArrayStack<ObjectProperty, Expression>();

        for(const item of props)
            if(!item.name) 
                chunks.push(item.value)
            else 
                chunks.insert(
                    t.objectProperty(
                        IsLegalIdentifier.test(item.name)
                            ? t.identifier(item.name)
                            : t.stringLiteral(item.name), 
                        item.value
                    )
                )

        const sequence = chunks.map(chunk => 
            isArray(chunk) ? t.objectExpression(chunk) : chunk)

        if(sequence.length == 1)
            return sequence[0]

        return t.callExpression(
            this.Assign, [t.objectExpression([]), ...sequence]
        )
    }

    container(
        src: ElementReact,
        fragmentKey?: Identifier | false
    ): Expression {
        const { children } = src;

        if(fragmentKey || children.length > 1)
            return this.fragment(children, fragmentKey);

        if(children.length == 0)
            return t.booleanLiteral(false);

        const [ head ] = children;

        if(head instanceof ElementReact)
            return head.toExpression()

        if(t.isExpression(head))
            return head;

        throw new Error("Bad Input");
    }

    fragment(
        children = [] as ContentLike[],
        key?: Expression | false
    ){
        const props = t.objectExpression(!key ? [] : [ 
            t.objectProperty(t.identifier("key"), key)
        ])
        
        return t.callExpression(this.Factory, [this.Fragment, props, ...this.children(children)])
    }

    children(input: ContentLike[]): Expression[] {
        const output = [];
        for(const child of input){
            if(child instanceof ElementReact)
                output.push(child.toExpression())

            if(t.isExpression(child))
                output.push(child)
        }
        return output;
    }
}