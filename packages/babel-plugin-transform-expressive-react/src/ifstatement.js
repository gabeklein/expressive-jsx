const t = require('babel-types');

const { ComponentGroup } = require('./component')
const { transform } = require('./shared');

export class ComponentSwitch {

    inlineType = "child"
    precedence = -1

    static applyTo(parent, src){
        parent.add(
            new this(src, parent)
        )
    }

    mayReceiveAttributes(){
        this.shouldOutputDynamic = true;
        return false;
    }

    constructor(path, parent){
        this.parent = parent;
        this.scope = path.scope;
        this.effectivePrecedence = parent.segue;
        const children = this.children = [];

        for(let current = path; true;){
            children.push(
                new ComponentConsequent(
                    parent, this,
                    current.get("consequent"),
                    current.get("test")
                )
            )
            current = current.get("alternate")

            if(current.type != "IfStatement"){
                if(current.node)
                    children.push(
                        new ComponentConsequent(parent, this, current)
                    )
                break;
            }
        }

        path.replaceWithMultiple(this.children.map(
            option => t.expressionStatement(option.doTransform)
        ));
    }

    transform(){
        if(this.shouldOutputDynamic)
            return this.dynamic();
        else
            return this.inline();
    }

    transform(){
        let product;
        let factory;

        if(!this.shouldOutputDynamic)
            product = this.inline();
        
        else {
            const id = product = this.scope.generateUidIdentifier("c");

            const statement = this.children.reduceRight(
                function(alt, option){
                    const body = t.blockStatement(
                        option.outputDynamic(id).factory
                    )
                    return option.test
                        ? t.ifStatement(option.test.node, body, alt)
                        : body
                },
                null
            )

            factory = [
                transform.declare("let", id),
                statement
            ]
        }

        return { factory, product }
    }

    inline(){
        return this.children.reduceRight(
            function(cond, item){
                const { test } = item;
                const { output } = item.collateChildren();
                
                const product = output.length > 1
                    ? transform.createFragment(output)
                    : output[0] || t.booleanLiteral(false)

                return test 
                    ? t.conditionalExpression(test.node, product, cond)
                    : product
            },
            t.booleanLiteral(false)
        )
    }
}

class ComponentConsequent extends ComponentGroup {
    constructor(parent, conditional, path, test){
        super()
        this.insertDoIntermediate(path)
        this.scope = path.scope;
        this.logicalParent = conditional
        this.test = test
        this.precedent = conditional.effectivePrecedence
        this.props = []
        this.style = []
    }

    didEnterOwnScope(path){
        super.didEnterOwnScope(path)
        this.body = path;

        this.logicalParent.shouldOutputDynamic = true;
        const p = this.props[0], s = this.style[0];
        if(p || s) this.bubble("mayReceiveAttributes", p, s);
    }

    insertDoIntermediate(path){
        var {node: consequent, type} = path;

        const doTransform = t.doExpression(
            type == "BlockStatement"
                ? consequent
                : t.blockStatement([consequent])
        )

        doTransform.meta = this;
        this.doTransform = doTransform;
    }

    outputDynamic(as){
        const factory = [];
        const { _accumulate } = this.context;

        const { body, output } = this.collateChildren(
            function insertAttribute(x){
                const target = _accumulate[x.inlineType];
                if(target) return x.asAssignedTo(target);
            }
        );

        const product = output.length > 1
            ? transform.createFragment(output)
            : output[0] || t.booleanLiteral(false)
        
        return {
            factory: [
                ...body,
                t.expressionStatement(
                    t.assignmentExpression(
                        "=", as, product
                    )
                )
            ]
        }
    }
}