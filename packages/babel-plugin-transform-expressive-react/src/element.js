import { Transform } from 'stream';

const t = require('babel-types')
const Do = require("./component");

const ELEMENT_TYPE_DEFAULT = t.stringLiteral("div");
const UNDERSCORE_AND = t.memberExpression(t.stringLiteral("_"), t.identifier("concat"));
const CREATE_ELEMENT = 
    t.memberExpression(
        t.identifier("React"),
        t.identifier("createElement")
    );
const CHILD_SEQUENCE = {
    Statement: -1,
    Prop: 0,
    ExplicitStyle: 1,
    ForLoop: 2,
    ComponentInline: 2,
    ComponentSwitch: 3,
}

const { ES6TransformDynamic, determineType } = require("./transform.js");

export class ComponentInline extends Do.ComponentScoped {

    constructor(parent){
        super(parent)
        this.type = "ComponentInline"
        this.classList = []
        this.sequenceIndex = 0
    }

    didEnterOwnScope(path){
        super.didEnterOwnScope(path)
    }

    get isSelfContained(){
        return !this.doesHaveDynamicProperties;
    }

    get ast(){
        if(this.doesHaveDynamicProperties)
            return new DynamicElementTransform(this).wrapped;
        else return ES6InlineTransform(this)
    }

    dynamic(_acc){
        return new DynamicElementTransform(this).include(_acc);
    }

    mayIncludeAccumulatingChildren(){
        this.containsAccumulatingChildren = true;
        return false;
    }

    mayReceiveConditionalAttrubutes(){
        this.doesHaveDynamicProperties = true;
        this.bubble("mayIncludeAccumulatingChildren")
    }

    include(obj){
        const thisIndex = CHILD_SEQUENCE[obj.type || 3];
        if(this.sequenceIndex > thisIndex){
            this.doesHaveDynamicProperties = true;
            this.include = super.include;
        }
        else if(thisIndex < 3) this.sequenceIndex = thisIndex;
        
        super.include(obj)
    }

    setIterableKey(_key, indicies){
        var _key = _key.node;

        for(const item of this.props)
            if(item.name == "key") return;

        this.children.unshift({
            type: "Prop",
            name: "key",
            node: t.binaryExpression(
                "+",
                !indicies 
                    ? t.stringLiteral("_") 
                    : t.stringLiteral(indicies.reduce((acc, i) => acc + i + "_", "_")),
                _key 
            )
        })
    }

    didExitOwnScope(){
        // debugger
        // this.flattenChildren();
    }
}

function ES6InlineTransform(target){
    let   _type = ELEMENT_TYPE_DEFAULT;
    const _props = [];
    const _style = [];
    const _classList = [];
    const _children = [];

    const { children } = target;

    let item, i = -1;

    for(const item of target.classList){
        const {name} = item;
        const include = target.use[name];

        if(include)
            children.splice(i+1, 0, ...include.children)

        else if(item.head == true)
            _type = determineType(name)

        else _classList.push(name)
    }

    while(item = children[++i])
        switch(item.type){
            case "ExpressionInline" :
            case "ComponentSwitch" : 
            case "ComponentInline" : {
                _children.push(item.ast)
            } break;

            case "Prop" : {
                _props.push(
                    t.objectProperty(
                        t.identifier(item.name),
                        item.node
                    )
                )
            } break;

            case "ExplicitStyle" : {
                _style.push(
                    t.objectProperty(
                        t.identifier(item.name), 
                        item.node
                    )
                )
            } break;
        }
    
    if(_style.length)
        _props.push(t.objectProperty(
            t.identifier("style"),
            t.objectExpression(_style)
        ))

    if(_classList.length)
        _props.push(t.objectProperty(
            t.identifier("className"),
            t.stringLiteral(_classList.reverse().join(" "))
        ))

    const create_element = target.use._createElement || CREATE_ELEMENT;

    return t.callExpression(create_element, [_type, t.objectExpression(_props), ..._children])

}

class DynamicElementTransform extends ES6TransformDynamic {

    constructor(target){
        super(target)

        const {
            body,
            use
        } = target;

        const scope = use.scope || body.scope;

        use._accumulate = {
            args: this.args = scope.generateUidIdentifier("e"),
            props: scope.generateUidIdentifier("p"),
            style: scope.generateUidIdentifier("s"),
            nProps: 0,
            nStyle: 0
        }

        this.data = Array.from(target.children)
        this.classList = [];

        this.parseClass()
        this.applyAll();
    }

    parseClass(){

        const {
            use, 
            source,
            classList
        } = this;

        const included = [];

        for(const { name, head } of source.classList){
            const include = use[name];

            if(include)
                included.push(include.children)
            else if(head == true)
                this._type = determineType(name)
            else classList.push(name);
        }

        if(included.length)
            this.data = included.concat(this.data)
    }

    include(_acc){
        const {
            _accumulate,
            _createElement
        } = this.use;

        return [
            ...this.output,
            t.expressionStatement(
                t.callExpression(
                    t.memberExpression(_acc, t.identifier("push")), [
                        t.callExpression(_createElement, [_accumulate.args])
                    ]
                )

            )
        ]
    }

    get wrapped(){

        const create_element = this.use._createElement || CREATE_ELEMENT;
        const {args: _args} = this;

        const returns = 
            t.returnStatement(
                t.callExpression(
                    create_element, [
                        t.spreadElement(_args)
                    ]
                )
            )

        const statements = [
            ...this.output,
            returns
        ]

        return t.callExpression(
            t.arrowFunctionExpression([], t.blockStatement(statements)), []
        )
    }

    get output(){

        const {stats, use} = this;
        const {args: _args, props: _props, style: _style, nStyle} = use._accumulate

        let init = [
            t.variableDeclarator( _props, t.objectExpression([]) ),
            t.variableDeclarator( _args,  t.arrayExpression([
                this._type, _props
            ]))
        ]

        if(nStyle){
            init.push(
                t.variableDeclarator( _style, t.objectExpression([]) ),
            )
            stats.push(
                t.expressionStatement(
                    t.assignmentExpression(
                        "=",
                        t.memberExpression( _props, t.identifier("style") ), 
                        _style
                    )
                )
                
            )
        } 

        return [
            t.variableDeclaration("const", init),
            ...stats
        ]
    }
}
