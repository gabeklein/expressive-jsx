
const t = require('babel-types')

export function determineType(name){
    return (
        /^[A-Z]/.test(name)
        ? t.identifier
        : t.stringLiteral
    )(name)
}

export class ES6TransformDynamic {
    constructor(target){
        this.source = target;
        this.use = target.use;
        this.stats = [];
    }

    applyAll(src = this.data){
        for(const item of src)
            (this[item.type] || this.Default).call(this, item)
    }

    assign(to, name, node){
        this.stats.push(
            t.expressionStatement(
                t.assignmentExpression("=",
                    t.memberExpression(to, t.identifier(name)),
                    node
                )
            )
        )
    }

    ExplicitStyle(item){
        delete this.chain;
        const {_accumulate: acc} = this.use;
        acc.nStyle++;
        this.assign(acc.style, item.name, item.node)
    }

    Prop(item){
        delete this.chain;
        const {_accumulate: acc} = this.use;
        acc.nProps++;
        this.assign(acc.props, item.name, item.node)
    }

    Statement(item){
        delete this.chain;
        this.stats.push(item.node)
    }

    ChildDynamic(item){
        delete this.chain;
        this.stats.push(
            ...item.dynamic(this.use._accumulate.args)
        )
    }

    ComponentRepeating(item){
        this.ChildDynamic(item);
    }

    ComponentSwitch(item){
        this.ChildDynamic(item);
    }

    ComponentInline(item){
        if(!item.containsAccumulatingChildren && !item.doesHaveDynamicProperties)
            this.Default(item)
        else 
            this.ChildDynamic(item)
    }

    Default(item){
        const node = item.ast;
        if(this.chain) this.chain.push(node)
        else this.stats.push(
            t.expressionStatement(
                t.callExpression(
                    t.memberExpression(this.use._accumulate.args, t.identifier("push")), this.chain = [node]
                )
            )
        )
    }
}

export class ES6FragmentTransformDynamic extends ES6TransformDynamic {

    ExplicitStyle(item){
        throw item.buildCodeFrameError("For Loops cannot contain styles as they have nothing to apply to")
    }

    Prop(){
        throw item.buildCodeFrameError("For Loops cannot contain props as they have nothing to apply to")
    }
}
