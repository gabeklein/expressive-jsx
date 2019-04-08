import t, { Expression, ObjectProperty, Statement } from '@babel/types';
import { findExistingRequire, ensureUID } from 'helpers';
import { ArrayStack, ContentLike, GenerateReact, PropData } from 'internal';
import { Module } from 'regenerate/module';

import { PropertyES } from './syntax';
import { ElementReact } from 'handle/element';

const IsComponentElement = /^[A-Z]\w*/;

export class GenerateES extends GenerateReact {

    reactImports: ObjectProperty[];

    constructor(module: Module){
        super(module);

        const { body } = module.path.node;
        this.reactImports = this.getReact(body);
    }

    getReact(body: Statement[]){
        const [index, imported] = findExistingRequire(body, "react");

        if(t.isObjectPattern(imported))
            return imported.properties as ObjectProperty[];
        else {
            const imports = [] as ObjectProperty[];
            const target =  
                t.isIdentifier(imported)
                    ? imported
                    : t.callExpression(
                        t.identifier("require"),
                        [ t.stringLiteral("react") ]
                    )
            this.willExitModule = () => {
                if(imports.length)
                body.splice(index + 1, 0, 
                    t.variableDeclaration("const", [
                        t.variableDeclarator(
                            t.objectPattern(imports), target
                        )
                    ])
                )
            }
            return imports
        }
    }

    get Fragment(){
        let id;
        const ref = ensureUID(this.module.path.scope, "Fragment");
        this.reactImports.push(
            t.objectProperty(
                t.identifier("Fragment"),
                id = t.identifier(ref),
                false,
                ref == "Fragment"
            )
        )
        Object.defineProperty(this, "Fragment", { value: id });
        return id;
    }

    get Create(){
        let id;
        const ref = ensureUID(this.module.path.scope, "create");
        this.reactImports.push(
            t.objectProperty(
                t.identifier("createElement"),
                id = t.identifier(ref)
            )
        )
        Object.defineProperty(this, "Create", { value: id });
        return id;
    }

    element(
        src: ElementReact){
            
        const {
            tagName: tag,
            props,
            children
        } = src;

        const type = IsComponentElement.test(tag)
            ? t.identifier(tag) 
            : t.stringLiteral(tag);

        return t.callExpression(
            this.Create, [
                type, 
                this.recombineProps(props), 
                ...this.recombineChildren(children)
            ]
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
        return input.map(child => (
            "toExpression" in child ? 
                child.toExpression() :
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