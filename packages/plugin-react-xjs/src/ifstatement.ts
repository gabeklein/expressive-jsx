import {
    Path,
    Scope,
    ExpressiveElementChild,
    ElementSyntax,
    Statement,
    Identifier,
    Expression,
    IfStatement,
    DoExpression
} from "./types";

import {
    ElementModifier,
    ComponentGroup,
    transform
} from "./internal";

import * as t from "@babel/types";

export class ComponentSwitch implements ExpressiveElementChild {

    inlineType = "child"
    precedence = 0
    shouldOutputDynamic?: true;
    children = [] as ComponentConsequent[];
    parent: ComponentGroup;
    scope: Scope;
    effectivePrecedence?: number; //remove
    provideStyle?: Identifier

    static applyTo(parent: ComponentGroup, src: Path<IfStatement>){
        parent.add(
            new this(src, parent)
        )
    }

    mayReceiveAttributes(){
        this.shouldOutputDynamic = true;
        return false;
    }

    constructor(path: Path<IfStatement>, parent: ComponentGroup){
        this.parent = parent;
        this.scope = path.scope;
        // this.effectivePrecedence = parent.segue;
        const children = this.children;

        let current: Path<any> = path;

        do {
            children.push(
                new ComponentConsequent(
                    parent, 
                    this,
                    current.get("consequent") as Path<Statement>,
                    current.get("test") as Path<Expression>
                )
            );
            
            current = current.get("alternate") as Path<Statement>

        } while(current.type == "IfStatement");

        if(current.node)
            children.push(
                new ComponentConsequent(parent, this, current)
            )

        path.replaceWithMultiple(this.children.map(
            option => t.expressionStatement(option.doTransform) as any
        ));
    }

    declareStyleOutput(){
        if(!this.provideStyle){
            // const pS: Identifier = this.provideStyle = this.scope.generateUidIdentifier("cc") as any;
            // this.parent.classList.push(pS)
        }
    }

    transform() {
        if(this.shouldOutputDynamic){
            let id: Identifier;
            for(const option of this.children)
                if(option.child.length){
                    id = this.scope.generateUidIdentifier("c");
                    break;
                }

            if(this.children.length < 1)
                throw new Error("If Component has no children?...");

            const ifStatement = 
                this.children.reduceRight(
                    function(
                        alt: undefined | Statement, 
                        option: ComponentConsequent ){

                        const { factory } = option.outputDynamic(id);
                        const body = factory.length === 1
                            ? factory[0]
                            : t.blockStatement(factory);

                        return option.test
                            ? t.ifStatement(option.test.node, body, alt)
                            : body
                    }, undefined
                )

            let factory: (Statement)[] = [ ifStatement! ];

            if(this.provideStyle)
                factory.unshift(
                    transform.declare("let", this.provideStyle)
                );

            const output: ElementSyntax = {
                factory,
                product: t.booleanLiteral(false)
            }

            if(id!){
                factory.unshift(
                    transform.declare("let", id, t.booleanLiteral(false))
                )
                output.product = id;
            }

            return output;
        }
        else return { product: this.inline() };
    }

    inline(){
        if(this.children.length > 1)
            return this.children.reduceRight(
                this.inlineReduction.bind(this), 
                t.booleanLiteral(false)
            );
        else {
            let { test, product } = this.extract(this.children[0]);
            
            let check: Expression = test!;

            if(check.type == "LogicalExpression")
                check = check.right;
                
            if(check.type != "BooleanLiteral" 
            && check.type != "BinaryExpression")
                check = t.unaryExpression("!", t.unaryExpression("!", check))

            return t.logicalExpression("&&", check, product);
        }
    }

    inlineReduction(alternate: Expression, current: ComponentConsequent){
        const { test, product } = this.extract(current);
        return test 
            ? t.conditionalExpression(test, product, alternate)
            : product
    }

    extract(item: ComponentConsequent): { test?: Expression, product: Expression } {
        const { test } = item;
        const { output } = item.collateChildren();

        const product = output.length > 1
            ? transform.createFragment(output)
            : output[0] || t.booleanLiteral(false);

        return {
            test: test && test.node,
            product
        };
    }
}

export class ComponentConsequent extends ComponentGroup {

    stylePriority = 4;
    test?: Path<Expression>;
    body?: Path<DoExpression>;
    logicalParent: ComponentSwitch;
    inlineType = "statement";
    precedence = 4;
    doesDelcareModifiers?: boolean;

    constructor(
        parent: ComponentGroup, 
        conditional: ComponentSwitch, 
        path: Path<Statement>, 
        test?: Path<Expression>){

        super()
        this.insertDoIntermediate(path)
        this.scope = path.scope;

        this.logicalParent = conditional
        this.test = test

        this.precedent = conditional.effectivePrecedence!;
        this.style_static = [];
    }

    insertDoIntermediate(path: Path<Statement>){
        var {node: consequent, type} = path;

        const body = 
            type == "BlockStatement"
                ? consequent : t.blockStatement([consequent])

        super.insertDoIntermediate(path, body)
    }

    didEnterOwnScope(path: Path<DoExpression>){
        super.didEnterOwnScope(path)
        this.body = path;

        // this.logicalParent.shouldOutputDynamic = true;
        const p = !!this.props.length;
        const s = !!this.style.length;
        if(p || s) 
            this.bubble("mayReceiveAttributes", p, s);
    }

    didExitOwnScope(body: Path<DoExpression>): void {
        super.didExitOwnScope(body);
        if(this.style_static.length || this.doesDelcareModifiers)
            this.provideStyles();
    }

    includeModifier(modifier: ElementModifier){
        this.parent.context.declare(modifier)
        this.doesDelcareModifiers = true;
        modifier.declareForConditional(this);
    }

    provideStyles(){
        this.logicalParent.shouldOutputDynamic = true;
        this.logicalParent.declareStyleOutput();

        this.context.declareForRuntime(this as any);

        const batch = this.logicalParent.children;
        let index = batch.indexOf(this);
        this.generateUCN(
            index == 0 ?
                "if" :
            index == batch.length - 1 ?
                "else" :
                "elseif"
        )
    }

    outputDynamic(ident: Identifier){
        const { _accumulate } = this.context;

        const { body, output } = this.collateChildren(
            function insertAttribute(x){
                const target = _accumulate[x.inlineType];
                if(target) return x.asAssignedTo(target);
            }
        );

        if(this.uniqueClassname){
            const cc = this.logicalParent.provideStyle;
            body.unshift(
                t.expressionStatement(
                    t.assignmentExpression(
                        "=", cc!, t.stringLiteral(this.uniqueClassname)
                    )
                )
            )
        }

        const product = output.length > 1
            ? transform.createFragment(output)
            : output[0];

        if(product)
            body.push(
                t.expressionStatement(
                    t.assignmentExpression(
                        "=", ident, product
                    )
                )
            )
        
        return {
            factory: body
        }
    }
}