import {
    ArrowFunctionExpression,
    // Function as SyntaxFunction,
    Identifier,
    MemberExpression,
    PatternLike,
    VariableDeclaration,
} from '@babel/types';

import t, { applyNameImplications, ElementInline, StackFrame, GenerateJSX, transform } from '../internal';
import { DoExpressive, Path } from '../internal/types';

export class ComponentExpression extends ElementInline {

    constructor(
        name: string,
        context: StackFrame,
        path: Path<DoExpressive>){

        super(context);

        this.primaryName = name;
        if(/^[A-Z]/.test(name))
            applyNameImplications(name, this);

        path.node.meta = this;
    }

    didExitOwnScope(path?: Path<DoExpressive>){
    }
}

export class ComponentArrowExpression extends ComponentExpression {
    constructor(
        name: string,
        context: StackFrame,
        path: Path<DoExpressive>,
        private fn: Path<ArrowFunctionExpression>){
    
        super(name, context, path);
    }

    didExitOwnScope(path: Path<DoExpressive>){
        // const bodyShouldDeclare = this.handleParameters();
        const collated = GenerateJSX(this);
        void collated;

        this.fn.get("body").replaceWith(
            t.identifier("hi")
        );
    }

    handleParameters() : VariableDeclaration | undefined {

        const { fn } = this;
        const params = fn.get("params")
        if(params.length == 0) return; 

        const props = params[0];

        if(props.isAssignmentPattern())
            throw props.get("right").buildCodeFrameError(
                "This argument will always resolve to component props");
        
        if(params.length > 1){
            const children = params.slice(1);
            let assign = children[0].node;
            let init: Identifier | MemberExpression | undefined;

            if(t.isRestElement(assign))
                assign = assign.argument;
            else {
                const destructure = [] as PatternLike[];
                for(const child of children){
                    if(t.isPatternLike(child.node))
                        destructure.push(child.node)
                    else 
                        throw child.buildCodeFrameError(`Argument of type ${child.type} not supported here!`)
                }
                assign = t.arrayPattern(destructure);
            }
    
            if(props.isObjectPattern())
                props.node.properties.push(
                    t.objectProperty(
                        t.identifier("children"), 
                        t.isIdentifier(assign)
                            ? assign
                            : init = fn.scope.generateUidIdentifier("children")
                    )
                )
            else if(props.isIdentifier())
                init = t.memberExpression(
                    props.node, 
                    t.identifier("children")
                );

            fn.node.params = [ props.node ];

            if(init)
                return transform.declare("var", assign, init);
        }
    }
}