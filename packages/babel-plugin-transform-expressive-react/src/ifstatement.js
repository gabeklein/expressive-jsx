const t = require('babel-types');

const { ComponentScoped } = require('./component')

export class ComponentSwitch {

    constructor(path, parent){
        this.parent = parent;
        
        const children = this.children = [];
        this.type = "ComponentSwitch"

        let current = path;

        while(true){
            children.push(
                new ComponentSwitchOption(
                    parent, 
                    current.get("consequent"),
                    current.get("test")
                )
            )
            current = current.get("alternate")

            if(current.isIfStatement()) continue;
            else {
                if(current.node)
                    children.push(
                        new ComponentSwitchOption(parent, current)
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

class ComponentSwitchOption extends ComponentScoped {
    constructor(parent, body, test){
        super(parent)

        this.queueTransform(body)
        this.test = test;
    }

    mayReceiveConditionalAttrubutes(){
        return false
    }

    queueTransform(path){
        var {node: consequent, type} = path;

        const doTransform = t.doExpression(
            type == "BlockStatement"
                ? consequent
                : t.blockStatement([consequent])
        )

        doTransform.meta = this;
        this.doTransform = doTransform;
    }

    didEnterOwnScope(path){
        this.body = path;
        super.didEnterOwnScope(path)
    }

    AssignmentExpression(path){
        this.bubble("mayReceiveConditionalAttrubutes", path)
        super.AssignmentExpression(path);
    }

    LabeledExpressionStatement(path){
        this.bubble("mayReceiveConditionalAttrubutes", path)
        super.LabeledExpressionStatement(path);
    }

    get ast(){
        const { stats, output } = this.classifyChildren();
        return !stats.length
            ? output
            : t.callExpression(
                t.arrowFunctionExpression([], t.blockStatement(
                    stats.concat(
                        t.returnStatement(output)
                    )
                )), []
            )
    }
}

const { ES6TransformDynamic } = require("./transform.js")

export class ES6ConditionalTransform extends ES6TransformDynamic {

    get output(){
        let alternate = null

        for(const target of this.source.children.reverse()){

            const stats = this.stats = [];
            this.use = target.use;
            this.applyAll(target.children)

            const option = t.blockStatement(stats);
            
            alternate = target.test
                ? t.ifStatement(target.test.node, option, alternate)
                : option
        }

        const statements = [
            alternate
        ]

        return statements
    }

}