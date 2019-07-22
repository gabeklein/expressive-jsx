import {
    ArrayPattern,
    arrayPattern,
    blockStatement,
    Expression,
    Identifier,
    identifier,
    isIdentifier,
    isPatternLike,
    isRestElement,
    MemberExpression,
    memberExpression,
    numericLiteral,
    ObjectPattern,
    objectProperty,
    PatternLike,
    returnStatement,
    Statement,
    stringLiteral,
} from '@babel/types';
import { ComponentExpression, DoExpressive, ParseErrors } from '@expressive/babel-plugin-core';
import { callExpress, declare, objectExpress } from 'generate/syntax';
import { ElementReact, ExternalsManager, GenerateReact } from 'internal';
import { StackFrame, Visitor } from 'types';

const Error = ParseErrors({
    PropsCantHaveDefault: "This argument will always resolve to component props",
    ArgumentNotSupported: "Argument of type {1} not supported here!"
})

export const DoExpression = <Visitor<DoExpressive>> {
    exit(path, state){

        const meta = path.node.meta;
        const context = meta.context as StackFrame;
        const Generator = context.Generator as GenerateReact;

        if(!(meta instanceof ComponentExpression))
            return;

        const factory = new ElementReact(meta);

        context.Module.lastInsertedElement = path;

        if(factory.children.length == 0 && meta.exec === undefined){
            path.replaceWith(
                asOnlyAttributes(factory)
            )
            return;
        }

        const factoryExpression = Generator.container(factory)

        if(meta instanceof ComponentExpression && meta.exec)
            incorperateChildParameters(meta, state.context.Imports)

        if(meta.exec && meta.statements.length){
            const replacement = [
                ...meta.statements as Statement[],
                returnStatement(factoryExpression)
            ];
            if(path.parentPath.isReturnStatement())
                path.parentPath.replaceWithMultiple(replacement)
            else
                path.replaceWith(blockStatement(replacement))
        }
        else {
            const prop = path.node.expressive_parent;
            if(prop)
                prop.value = factoryExpression as Expression;
            else
                path.replaceWith(factoryExpression);
        }
    }
}

function asOnlyAttributes(factory: ElementReact){
    const classNames = factory.classList as string[];
    let style: Expression | undefined;

    for(const prop of factory.props)
        if(prop.name == "style")
            style = prop.value || objectExpress()

    return objectExpress({
        className: stringLiteral(
            classNames.join(" ")
        ),
        style: style
    })
}

function incorperateChildParameters(
    Do: ComponentExpression,
    Imports: ExternalsManager
){
    const wrapperFunction = Do.exec;
    let assign: Identifier | ArrayPattern | ObjectPattern
    let init: Identifier | MemberExpression | undefined;

    if(wrapperFunction === undefined) return;
    
    const params = wrapperFunction.get("params") as any;
    if(params.length < 2) return; 

    const props = params[0];
    const arrowFn = wrapperFunction.node;
    const children = params.slice(1);
    const first = children[0].node;
    let count = children.length;

    if(props.isAssignmentPattern())
        throw Error.PropsCantHaveDefault(props.get("right"))

    if(isRestElement(first)){
        assign = first.argument as typeof assign;
        count += 1;
    }
    else {
        const destructure = [] as PatternLike[];
        for(const child of children){
            if(isPatternLike(child.node))
                destructure.push(child.node)
            else 
                throw Error.ArgumentNotSupported(child, child.type)
        }
        assign = count > 1
            ? arrayPattern(destructure)
            : destructure[0] as Identifier;
    }

    if(props.isObjectPattern())
        props.node.properties.push(
            objectProperty(
                identifier("children"), 
                isIdentifier(assign) 
                    ? assign
                    : init = wrapperFunction.scope.generateUidIdentifier("children")
            )
        )
        
    else if(props.isIdentifier())
        init = memberExpression(props.node, identifier("children"));

    arrowFn.params = [props.node as Identifier | ObjectPattern];
        
    if(init){
        const inner = Imports.ensure("@expressive/react", "body");
        let getKids = callExpress(inner, props.node as Expression) as Expression;
        if(count == 1)
            getKids = memberExpression(getKids, numericLiteral(0), true)

        const declarator = declare("var", assign, getKids);
        Do.statements.unshift(declarator)
    }
}