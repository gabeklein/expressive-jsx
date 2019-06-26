import t, { Expression, ObjectProperty } from '@babel/types';
import { ArrayStack, ElementReact, GenerateReact } from 'internal';
import { ContentLike, PropData } from 'types';
import { callExpression, memberExpression, objectExpression, PropertyES } from './syntax';

const IsComponentElement = /^[A-Z]\w*/;

export class GenerateES extends GenerateReact {

    get Fragment(){
        let id = this.external.ensure("react", "Fragment");
        Object.defineProperty(this, "Fragment", { value: id });
        return id;
    }

    get Create(){
        let id = this.external.ensure(
            "react", "createElement", "create"
        );

        Object.defineProperty(this, "Create", { value: id });
        return id;
    }

    element(src: ElementReact){
        const {
            tagName: tag,
            props,
            children
        } = src;

        const type = IsComponentElement.test(tag)
            ? t.identifier(tag) 
            : t.stringLiteral(tag);

        return callExpression(
            this.Create, 
            type, 
            this.recombineProps(props), 
            ...this.recombineChildren(children)
        ) 
    }

    fragment(
        children = [] as ContentLike[],
        key?: Expression | false
    ){
        return (
            callExpression(
                this.Create,
                this.Fragment,
                objectExpression({ key }),
                ...this.recombineChildren(children)
            ) 
        )
    }

    private recombineChildren(input: ContentLike[]): Expression[] {
        return input.map(child => (
            "toExpression" in child ? 
                child.toExpression(this) :
            t.isExpression(child) ?
                child :
            child instanceof ElementReact 
                ? this.element(child)
                : t.booleanLiteral(false)
        ));
    }
    
    private recombineProps(props: PropData[]){
        const propStack = new ArrayStack<ObjectProperty, Expression>()

        if(props.length == 0)
            return objectExpression()
    
        for(const { name, value } of props)
            if(!name)
                propStack.push(value);
            else
                propStack.insert(
                    PropertyES(name, value)
                );
    
        let properties = propStack.map(chunk => 
            Array.isArray(chunk)
                ? t.objectExpression(chunk)
                : chunk
        )
    
        if(properties[0].type !== "ObjectExpression")
            properties.unshift(
                objectExpression()
            )
    
        return (
            properties.length == 1
                ? properties[0]
                : callExpression(
                    memberExpression("Object.assign"), 
                    ...properties
                )
        )
    }
}