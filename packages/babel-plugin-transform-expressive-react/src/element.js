import { Transform } from 'stream';

const t = require('babel-types')
const Do = require("./component");

const ELEMENT_TYPE_DEFAULT = t.stringLiteral("div");
const UNDERSCORE_AND = t.memberExpression(t.stringLiteral("_"), t.identifier("concat"));

const { ES6TransformDynamic, determineType } = require("./transform.js");

export class ComponentInline extends Do.ComponentScoped {

    constructor(parent){
        super(parent)
        this.type = "ComponentInline"
        this.classList = []
        this.sequenceIndex = -1
    }

    didEnterOwnScope(path){
        super.didEnterOwnScope(path)
    }

    get isSelfContained(){
        return !this.shouldRenderDynamic;
    }

    get typeInformation(){
        let elementType = ELEMENT_TYPE_DEFAULT;
        const classList = [];
        const included = [];

        for(const item of this.classList){
            const {name} = item;
            const include = this.use[name];

            if(include)
                included.push(...include.children)

            else if(item.head == true)
                elementType = determineType(name)

            else classList.push(name)
        }

        return {
            elementType, classList, included
        }
    }

    get transform(){

        const {
            included, elementType, classList
        } = this.typeInformation;

        const {
            contains, style, props, stats
        } = this.classifyChildren(
            included.concat(this.children)
        );

        const { _createElement } = this.use;

        if(style)
            props.push(
                t.objectProperty(
                    t.identifier("style"),
                    t.objectExpression(style)
                )
            )

        if(classList.length)
            props.push(
                t.objectProperty(
                    t.identifier("className"),
                    t.stringLiteral(classList.reverse().join(" "))
                )
            )

        const generator = t.callExpression(_createElement, [elementType, t.objectExpression(props), ...contains]);

        //if only child is an encapsulated scope, we can strip the iife, using its own return value
        if(stats.length){
            const iife = t.callExpression(
                t.arrowFunctionExpression([], t.blockStatement(
                    stats.concat(
                        t.returnStatement(generator)
                    )
                )), []
            );
            iife.expressiveEnclosure = true;
            return iife;
        }
        else return generator;
    }

    get ast(){
        if(this.shouldRenderDynamic)
            return new DynamicElementTransform(this).wrapped;
        else
            return this.transform;
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
        return void 0;
    }
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
            n_props: 0,
            n_style: 0
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
            _createApplied
        } = this.use;

        return [
            ...this.output,
            t.expressionStatement(
                t.callExpression(
                    t.memberExpression(_acc, t.identifier("push")), [
                        t.callExpression(
                            _createApplied, 
                            [ _accumulate.args ]
                        )
                    ]
                )

            )
        ]
    }

    get wrapped(){

        const { _createApplied } = this.use;
        const {args: _args} = this;
        const returns = 
            t.returnStatement(
                t.callExpression(
                    _createApplied, [ _args ]
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
        const {args: _args, props: _props, style: _style, n_style} = use._accumulate

        let init = [
            t.variableDeclarator( _props, t.objectExpression([]) ),
            t.variableDeclarator( _args,  t.arrayExpression([
                this._type, _props
            ]))
        ]

        if(n_style){
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
