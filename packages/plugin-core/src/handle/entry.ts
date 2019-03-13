import t, {
    ArrowFunctionExpression,
    Identifier,
    LVal,
    MemberExpression,
    PatternLike,
    VariableDeclaration,
} from '@babel/types';

import { applyNameImplications, ElementInline, StackFrame } from 'internal';
import { DoExpressive, Path } from 'types';

export class ComponentExpression extends ElementInline {

    exec?: Path<ArrowFunctionExpression>

    constructor(
        name: string,
        context: StackFrame,
        path: Path<DoExpressive>,
        exec?: Path<ArrowFunctionExpression>){

        super(context);

        if(exec){
            this.exec = exec;
            this.extractParams();
        }

        this.primaryName = name;
        if(/^[A-Z]/.test(name))
            applyNameImplications(name, this);

        path.node.meta = this;
    }

    // didExitOwnScope(path: Path<DoExpressive>){
    //     const { exec } = this;
    //     const [ element ] = this.generate();
    //     if(exec){
    //         exec.get("body").replaceWith(element);
    //     }
    //     else 
    //         path.replaceWith(element); 
    // }

    private extractParams() : VariableDeclaration | undefined {

        const fn = this.exec!;
        const params = fn.get("params")
        if(params.length == 0) return; 

        const props = params[0];

        if(props.isAssignmentPattern())
            throw props.get("right").buildCodeFrameError(
                "This argument will always resolve to component props");
        
        if(params.length > 1){
            const children = params.slice(1);
            let first = children[0].node;
            let assign: LVal;
            let init: Identifier | MemberExpression | undefined;

            if(t.isRestElement(first))
                assign = first.argument;
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

            void init;

            // if(init)
            //     return transform.declare("var", assign, init);
        }
    }
}