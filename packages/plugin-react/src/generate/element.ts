import { Scope } from '@babel/traverse';
import t, { Expression, Identifier, ModuleSpecifier, CallExpression, JSXElement } from '@babel/types';
import { ElementSwitch, ContentLike, ElementReact, Module } from 'internal';
import { ensureSpecifier } from 'helpers';
import { PropData } from 'types';

export abstract class GenerateReact {
    constructor(
        protected reactImports: ModuleSpecifier[],
        protected scope: Scope
    ){}

    didEnterModule?(M: Module): void
    willExitModule?(M: Module): void;

    abstract fragment(
        children?: ContentLike[],
        key?: Expression | false
    ): CallExpression | JSXElement

    abstract element(
        tag: string,
        props?: PropData[],
        children?: ContentLike[]
    ): CallExpression | JSXElement;

    protected getFragmentImport<T>(
        type: (name: string) => T
    ): T {
        const uid = ensureSpecifier(
            this.reactImports,
            this.scope,
            "Fragment"
        )

        const Fragment = type(uid);

        Object.defineProperty(this, "Fragment", { configurable: true, value: Fragment })
        return Fragment;
    }

    container(
        src: ElementReact | ElementSwitch,
        fragmentKey?: Identifier | false
    ): Expression {

        let fragmentChildren: ContentLike[] | undefined;

        if(src instanceof ElementReact){
            const { props, children } = src; 
            if(props.length == 0){
                if(children.length)
                    src = src.children[0] as any;
                else 
                    return t.booleanLiteral(false);
            }

            if(fragmentKey || children.length > 1)
                fragmentChildren = children;
        }

        if(fragmentChildren){
            return this.fragment(fragmentChildren, fragmentKey);
        }

        if("toExpression" in src)
            return src.toExpression();

        if(t.isExpression(src))
            return src;

        throw new Error("Bad Input");
    }
}