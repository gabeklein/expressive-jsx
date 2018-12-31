export class ComponentArrowExpression extends ElementInline {

    constructor(
        name: string,
        path: Path<DoExpressive>, 
        public container: Path<SyntaxFunction>){

        super();
        path.node.meta = this;
        this.primaryName = name;
    }

    didExitOwnScope(
        path: Path<DoExpressive>){

        const containerFunction = this.container;

        const shouldDeclare = this.handleParameters(containerFunction);

        const body = containerFunction.get("body");
        const { product, factory = [] } = this.build();

        if(shouldDeclare)
            factory.unshift(shouldDeclare);

        body.replaceWith(
            factory.length === 0
                ? product
                : t.blockStatement([
                    ...factory,
                    t.returnStatement(product)
                ])
        )

        // if(this.hasStaticStyle || this.mayReceiveExternalClasses)
        //     this.generateUCN();

        this.context.pop();
    }

    private handleParameters(
        fn: Path<SyntaxFunction>
        ) : VariableDeclaration | undefined {

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