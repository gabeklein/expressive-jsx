const t = require('babel-types');

const { ComponentGroup } = require('./component')
const { transform, Opts } = require('./shared');

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

    declareStyleOutput(){
        if(!this.provideStyle){
            const pS = this.provideStyle = this.scope.generateUidIdentifier("cc")
            this.parent.classList.push(pS)
        }
    }

    transform(){
        if(this.shouldOutputDynamic){
            let id;
            for(const option of this.children)
                if(option.child.length){
                    id = this.scope.generateUidIdentifier("c");
                    break;
                }

            const factory = [
                this.children.reduceRight(
                    function(alt, option){
                        const { factory } = option.outputDynamic(id);
                        const body = factory.length > 1
                            ? t.blockStatement(factory)
                            : factory[0]
                        return option.test
                            ? t.ifStatement(option.test.node, body, alt)
                            : body
                    }, null
                )
            ]
            if(this.provideStyle)
                factory.unshift(
                    transform.declare("let", this.provideStyle)
                )

            const output = {
                factory,
                product: null
            }

            if(id){
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
        return this.children.reduceRight(
            this.inlineReduction, t.booleanLiteral(false)
        )
    }

    inlineReduction(cond, item){
        const { test } = item;
        const { output } = item.collateChildren();
        
        const product = output.length > 1
            ? transform.createFragment(output)
            : output[0] || t.booleanLiteral(false)

        return test 
            ? t.conditionalExpression(test.node, product, cond)
            : product
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
        this.style_static = [];
    }

    didEnterOwnScope(path){
        super.didEnterOwnScope(path)
        this.body = path;

        this.logicalParent.shouldOutputDynamic = true;
        const p = this.props[0], s = this.style[0];
        if(p || s) this.bubble("mayReceiveAttributes", p, s);
    }

    didExitOwnScope(body){
        super.didExitOwnScope(body);
        if(this.style_static.length)
            this.provideStyles();
    }

    provideStyles(){
        this.logicalParent.shouldOutputDynamic = true;
        this.logicalParent.declareStyleOutput();

        this.declareForStylesInclusion(this);

        const batch = this.logicalParent.children;
        let index = batch.indexOf(this);
        this.generateClassName(
            index == 0 ?
                "if" :
            index == batch.length - 1 ?
                "else" :
                "elseif"
        )
    }

    insertDoIntermediate(path){
        var {node: consequent, type} = path;

        const body = 
            type == "BlockStatement"
                ? consequent : t.blockStatement([consequent])

        super.insertDoIntermediate(path, body)
    }

    outputDynamic(as){
        const { _accumulate } = this.context;

        const { body, output } = this.collateChildren(
            function insertAttribute(x){
                const target = _accumulate[x.inlineType];
                if(target) return x.asAssignedTo(target);
            }
        );

        if(this.classname){
            const cc = this.logicalParent.provideStyle;
            body.unshift(
                t.expressionStatement(
                    t.assignmentExpression(
                        "=", cc, t.stringLiteral(this.classname)
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
                        "=", as, product
                    )
                )
            )
        
        return {
            factory: body
        }
    }
}