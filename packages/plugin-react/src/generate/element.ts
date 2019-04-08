import t, { CallExpression, Expression, Identifier, JSXElement } from '@babel/types';
import { ContentLike, ElementReact, Module } from 'internal';

export abstract class GenerateReact {

    constructor(
        protected module: Module
    ){}

    didEnterModule?(): void;
    willExitModule?(): void;

    abstract fragment(
        children?: ContentLike[],
        key?: Expression | false
    ): CallExpression | JSXElement

    abstract element(
        src: ElementReact
    ): CallExpression | JSXElement;

    public container(
        src: ElementReact,
        fragmentKey?: Identifier | false
    ): Expression {

        let output: ContentLike | undefined;

        if(src.props.length == 0){
            const { children } = src; 

            if(children.length == 0)
                return t.booleanLiteral(false);

            if(fragmentKey || children.length > 1)
                return this.fragment(children, fragmentKey);
                
            output = children[0];
        }

        if(!output)
            output = this.element(src)
            
        else if("toExpression" in output)
            output = output.toExpression()

        else if(output instanceof ElementReact)
            output = this.element(output)
    
        if(fragmentKey)
            return this.fragment([ output ], fragmentKey)
        else 
            return output
    }
}