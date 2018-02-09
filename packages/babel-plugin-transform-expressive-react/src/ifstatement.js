const t = require('babel-types');

const { ComponentGroup } = require('./component')
const { transform } = require('./shared');

export class ComponentSwitch {

    groupType = "inner"
    precedence = 3

    static applyTo(parent, src){
        parent.add(
            new this(src, parent)
        )
    }

    outputAccumulating(){
        
    }

    constructor(path, parent){
        this.parent = parent;

        this.effectivePrecedence = parent.sequenceIndex;
        
        const children = this.children = [];
        this.type = "ComponentSwitch"

        let current = path;

        while(true){
            children.push(
                new ComponentConsequent(
                    parent, this,
                    current.get("consequent"),
                    current.get("test")
                )
            )
            current = current.get("alternate")

            if(current.isIfStatement()) continue;
            else {
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

    dynamic(){
        return new ES6ConditionalTransform(this).output
    }

    get ast(){
        const opt = this.children;
        let output = t.booleanLiteral(false);

        for(let child, i = opt.length; child = opt[--i];)
            output = child.test 
                ? t.conditionalExpression(child.test.node, child.ast, output)
                : child.ast
        
        return output;
    }
}

class ComponentConsequent extends ComponentGroup {
    constructor(parent, conditional, path, test){
        super(path, parent)
        this.logicalParent = conditional
        this.sequenceIndex = conditional.effectivePrecedence
        this.test = test
        this.props = []
        this.style = []
    }

    mayReceiveConditionalAttrubutes(){
        return false
    }

    set doesHaveDynamicProperties(bool){
        // this.logicalParent.bubble("scopeDoesHaveDynamicProperties")
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

    // outputAccumulating(ex_scope){
    //     const 
    // }

    didEnterOwnScope(path){
        this.body = path;
        super.didEnterOwnScope(path)
    }

    outputSelfContained(){
        const { stats, output } = this.classifyChildren();
        return !stats.length
            ? output
            : transform.IIFE(
                stats.concat(
                    t.returnStatement(output)
                )
            )
    }

    AssignmentExpression(path){
        this.bubble("mayReceiveConditionalAttrubutes", path)
        super.AssignmentExpression(path);
    }

    LabeledExpressionStatement(path){
        this.bubble("mayReceiveConditionalAttrubutes", path)
        super.LabeledExpressionStatement(path);
    }

}