
const t = require('babel-types')

export function determineType(name){
    return (
        /^[A-Z]/.test(name)
        ? t.identifier
        : t.stringLiteral
    )(name)
}

const CHILD_TYPE_TO = {
    Statement: "statements",

    ExplicitStyle: "style",
    StyleInclusion: "style",

    Prop: "props",
    PropInclusion: "props",

    ComponentSwitch: "children",
    ComponentRepeating: "children",
    ComponentInline: "children",
    Default: "children"
}

export class ES6TransformDynamic {
    constructor(target){
        this.source = target;
        this.use = target.use;
        this.stats = [];
    }

    preprocess(src = this.data){
        for(const item of src)
            (this[item.type] || this.Default).call(this, item)
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

    spread(into, src){
        const acc = this.use._accumulate;
        acc['n_' + into]++;
        into = acc[into];
        this.stats.push(
            t.expressionStatement(
                t.callExpression(
                    t.memberExpression(
                        t.identifier("Object"),
                        t.identifier("assign")
                    ), [
                        into, src.node
                    ]
                )
            )
        )
    }

    ExplicitStyle(item){
        delete this.chain;
        const {_accumulate: acc} = this.use;
        acc.n_style++;
        this.assign(acc.style, item.name, item.node)
    }

    Prop(item){
        delete this.chain;
        const {_accumulate: acc} = this.use;
        acc.n_props++;
        this.assign(acc.props, item.name, item.node)
    }

    PropInclusion(item){
        this.spread("props", item)
    }

    StyleInclusion(item){
        this.spread("style", item)
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
                    t.memberExpression(
                        this.use._accumulate.args, 
                        t.identifier("push")
                    ), 
                    this.chain = [node]
                )
            )
        )
    }
}

export class ES6FragmentTransform extends ES6TransformDynamic {

    ExplicitStyle(item){
        throw item.buildCodeFrameError("This error really shouldnt occur, file a bug report")
    }

    Prop(){
        throw item.buildCodeFrameError("This error really shouldnt occur, file a bug report")
    }
}
