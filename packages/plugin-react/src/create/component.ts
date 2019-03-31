import t, {
    ArrayPattern,
    ArrowFunctionExpression,
    Expression,
    Identifier,
    MemberExpression,
    ObjectPattern,
    PatternLike
} from '@babel/types';
import { ComponentExpression, DoExpressive, ElementInline, ParseErrors, Path } from '@expressive/babel-plugin-core';
import { BabelVisitor, ElementJSX, JSXContent } from 'internal';
import { createElement, createFragment, declare, ensureArray } from 'syntax';

const Error = ParseErrors({
    PropsCantHaveDefault: "This argument will always resolve to component props",
    ArgumentNotSupported: "Argument of type {1} not supported here!"
})

export const DoExpression = <BabelVisitor<DoExpressive>> {
    exit(path){
        const DoNode = path.node.meta;

        if(!(DoNode instanceof ComponentExpression))
            return;

        const factoryExpression = new ContainerJSX(DoNode).toExpression();

        if(DoNode.exec)
            if(incorperateChildParameters(DoNode.exec, factoryExpression))
                return
        
        path.replaceWith(factoryExpression);
    }
}

export class ContainerJSX<T extends ElementInline = ElementInline>
    extends ElementJSX<T> {

    replace(path: Path<DoExpressive>){
        path.replaceWith(
            this.toExpression()
        )
    }

    toElement(): JSXContent {
        const output = this.toExpression();
        if(t.isJSXElement(output))
            return output;
        else
            return t.jsxExpressionContainer(output);
    }

    toShallowContent(){
        const { props, children } = this;

        if(props.length == 0){
            if(children.length > 1)
                return createFragment(this.jsxChildren)
            if(children.length == 0)
                return t.booleanLiteral(false)

            return children[0].toExpression();   
        }
    }

    toExpression(): Expression {
        return (
            this.toShallowContent() || 
            createElement(
                this.tagName, 
                this.props, 
                this.jsxChildren
            )
        );
    }
}

function incorperateChildParameters(
    wrapperFunction: Path<ArrowFunctionExpression>,
    outputExpression: Expression
){
    let assign: Identifier | ArrayPattern | ObjectPattern
    let init: Identifier | MemberExpression | undefined;

    if(wrapperFunction === undefined) return;
    const params = wrapperFunction.get("params")
    if(params.length < 2) return; 

    const props = params[0];
    const arrowFn = wrapperFunction.node;
    const children = params.slice(1);
    const first = children[0].node;
    let count = children.length;

    if(props.isAssignmentPattern())
        throw Error.PropsCantHaveDefault(props.get("right"))

    if(t.isRestElement(first)){
        assign = first.argument as typeof assign;
        count += 1;
    }
    else {
        const destructure = [] as PatternLike[];
        for(const child of children){
            if(t.isPatternLike(child.node))
                destructure.push(child.node)
            else 
                throw Error.ArgumentNotSupported(child, child.type)
        }
        assign = count > 1
            ? t.arrayPattern(destructure)
            : destructure[0] as Identifier;
    }

    if(props.isObjectPattern())
        props.node.properties.push(
            t.objectProperty(
                t.identifier("children"), 
                t.isIdentifier(assign) 
                    ? assign
                    : init = wrapperFunction.scope.generateUidIdentifier("children")
            )
        )
    else if(props.isIdentifier())
        init = t.memberExpression(
            props.node, 
            t.identifier("children")
        );

    arrowFn.params = [props.node as Identifier | ObjectPattern];
    
    if(init){
        const { body } = arrowFn;
        const augment = declare("var", assign, ensureArray(init, count == 1));
        
        if(t.isBlockStatement(body))
            body.body.unshift(augment)
        else
            arrowFn.body = t.blockStatement([
                augment,
                t.returnStatement(outputExpression)
            ])
        return true
    }
}