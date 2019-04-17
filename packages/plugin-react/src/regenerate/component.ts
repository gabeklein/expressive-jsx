import t, { ArrayPattern, Expression, Identifier, MemberExpression, ObjectPattern, PatternLike } from '@babel/types';
import { ComponentExpression, DoExpressive, ParseErrors } from '@expressive/babel-plugin-core';
import { callExpression, declare, ElementReact, ExternalsManager, GenerateReact, memberExpression } from 'internal';
import { StackFrame, Visitor } from 'types';

const Error = ParseErrors({
    PropsCantHaveDefault: "This argument will always resolve to component props",
    ArgumentNotSupported: "Argument of type {1} not supported here!"
})

export const DoExpression = <Visitor<DoExpressive>> {
    exit(path, state){
        const Do = path.node.meta;
        const context = Do.context as StackFrame;
        const Generator = context.Generator as GenerateReact;

        if(!(Do instanceof ComponentExpression))
            return;

        const factory = new ElementReact(Do);

        const factoryExpression = Generator.container(factory)

        if(Do instanceof ComponentExpression && Do.exec)
            incorperateChildParameters(Do, state.context.Imports)

        if(Do.exec && Do.statements.length){
            const replacement = [
                ...Do.statements,
                t.returnStatement(factoryExpression)
            ];
            if(path.parentPath.isReturnStatement())
                path.parentPath.replaceWithMultiple(replacement)
            else
                path.replaceWith(t.blockStatement(replacement))
        }
        else {
            path.replaceWith(factoryExpression);
        }

        context.Module.lastInsertedElement = path;
    }
}

function incorperateChildParameters(
    Do: ComponentExpression,
    Imports: ExternalsManager
){
    const { exec: wrapperFunction } = Do;
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
        init = memberExpression(props.node, "children");

    arrowFn.params = [props.node as Identifier | ObjectPattern];
        
    if(init){
        const inner = Imports.ensure("@expressive/react", "body");
        let getKids = callExpression(inner, props.node as Expression) as Expression;
        if(count == 1)
            getKids = t.memberExpression(getKids, t.numericLiteral(0), true)

        const declarator = declare("var", assign, getKids);
        Do.statements.unshift(declarator)
    }
}