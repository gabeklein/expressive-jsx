import t, { Expression, ObjectProperty } from '@babel/types';
import { ContentLike, GenerateReact, ArrayStack, ElementReact, PropData } from 'internal';
import { ensureSpecifier } from 'helpers';
import { PropertyES } from './syntax';

const IsComponentElement = /^[A-Z]\w*/;

export class GenerateES extends GenerateReact {

    get Fragment(){
        return this.getFragmentImport(t.identifier);
    }

    get Create(){
        const uid = ensureSpecifier(
            this.reactImports,
            this.scope,
            "createElement",
            "create"
        )

        const Create = t.identifier(uid);
        Object.defineProperty(this, "Create", { configurable: true, value: Create })
        return Create;
    }

    element(
        tag: string,
        props = [] as PropData[],
        children = [] as ContentLike[]){

        const type = IsComponentElement.test(tag)
            ? t.identifier(tag) 
            : t.stringLiteral(tag);

        let propsExpression = this.recombineProps(props);

        return t.callExpression(
            this.Create, 
            [type, propsExpression, ...this.recombineChildren(children)]
        ) 
    }

    fragment(
        children = [] as ContentLike[],
        key?: Expression | false
    ){
        const attributes = key ? [PropertyES("key", key)] : [];
        
        return (
            t.callExpression(this.Create, [
                this.Fragment,
                t.objectExpression(attributes),
                ...this.recombineChildren(children)
            ]) 
        )
    }

    private recombineChildren(input: ContentLike[]): Expression[] {
        const output = [];
        for(const child of input){
            if(child instanceof ElementReact)
                output.push(child.toExpression())
    
            if(t.isExpression(child))
                output.push(child)
        }
        return output;
    }
    
    private recombineProps(props: PropData[]){
        const propStack = new ArrayStack<ObjectProperty, Expression>()

        if(props.length == 0)
            return t.objectExpression([]);
    
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
                t.objectExpression([])
            )
    
        return (
            properties.length == 1
                ? properties[0]
                : t.callExpression(
                    t.memberExpression(
                        t.identifier("Object"),
                        t.identifier("assign")
                    ), 
                    properties
                )
        )
    }
}