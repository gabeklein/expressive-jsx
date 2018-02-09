const t = require('babel-types')
const { Shared, transform } = require("./shared");
const { ChildNonComponent, Prop, Style } = require("./item")
const { ComponentGroup } = require("./component")

const ELEMENT_TYPE_DEFAULT = t.stringLiteral("div");

class ComponentInlineConstruct extends ComponentGroup {
    static applyTo(parent, path){
        if(path.node 
        && path.node.extra
        && path.node.extra.parenthesized === true)
            return new ChildNonComponent(path)

        let props = [];

        if(path.isSequenceExpression())
            [path, ...props] = path.get('expressions');

        if(path.isBinaryExpression({operator: ">"})){
            props.push({type: "ChildLiteral", node: path.get("right").node})
            path = path.get("left")
        }

        const stack = [{props}];

        while(path.isBinaryExpression({operator: ">>"})){
            stack[0].path = path.get("right")
            path = path.get("left")
            stack.unshift({})
        }
        stack[0].path = path;

        for(const {path, props} of stack){

            if(path.node == undefined)
                throw path.buildCodeFrameError("Invalid child has no value")

            if(path.node.extra && path.node.extra.parenthesized === true)
                throw path.buildCodeFrameError("Children in Parenthesis are not allowed, for direct insertion used an Array literal")

            if(path.type == "TemplateLiteral")
                throw path.buildCodeFrameError("Template literal is not a valid element")

            const inner = new this(path, parent)

            this.InlineProps.apply(inner, path);
            this.ExternalProps.apply(inner, props);

            parent.add(inner);
            parent = inner;
        }
    }
    
    static InlineProps = {

        apply(target, tag){

            const { text: type_text = t.identifier("Text") } = target.use._defaultType || {}; 

            if(tag.isBinaryExpression({operator: "-"})){
                const left = tag.get("left")
                if(left.isIdentifier())
                    target.prefix = left.node.name
                else
                    left.buildCodeFrameError("Improper element prefix");
                tag = tag.get("right")
            }

            while(!tag.node.extra && tag.type in this)
                tag = this[tag.type].call(target, tag);

            if(tag.isIdentifier())
                target.classList.push({name: tag.node.name, path: tag, head: true})

            else if(tag.isStringLiteral){
                target.classList.push({name: "Text", node: type_text, head: true})
            }

            else throw tag.buildCodeFrameError("Expression must start with an identifier")

        },

        TaggedTemplateExpression(tag){
            this.add("ExpressionInline", {kind: "text", ast: tag.node.quasi})
            return tag.get("tag")
        },

        CallExpression(tag){
            const args = tag.get("arguments");
            ExternalProps.apply(this, args)
            return tag.get("callee");
        },

        MemberExpression(tag){

            const selector = tag.get("property");

            if(tag.node.computed === true)
                throw selector.buildCodeFrameError("Due to how parser works, a semicolon is required after the element preceeding escaped children.")

            this.classList.push({
                name: selector.node.name, 
                path: selector
            })

            return tag.get("object");
        }
    }

    static ExternalProps = {

        apply(target, props){
            if(!props) return;
            for(let item of props){
                const handle = this[item.type];
                if(handle == undefined) 
                    if(~item.type.indexOf("Literal")) target.add(new ChildNonComponent(item))
                    else throw item.buildCodeFrameError(`Unhandled prop of type ${item.type}`)
                else if(item = handle.call(target, item)) target.add(item)
            }
        },

        TaggedTemplateExpression(path){
            const {tag, quasi} = path.node;
            if(tag.type != "Identifier") 
                throw path.buildCodeFrameError("Prop must be an Identifier");
            return new Prop(tag, quasi)
        },

        AssignmentExpression(path){
            if(path.node.operator != "=")
                throw path.get("operator").buildCodeFrameError("Props may only be assigned with `=` or using tagged templates.");

            const left = path.get("left");
            if(left.isMemberExpression())
                throw left.buildCodeFrameError("Member Expressions can't be prop names");

            return new Prop(left.node, path.node.right)
        },

        Identifier(path){
            return new Prop(
                path.node.name,
                path.node
            )
        },

        UnaryExpression(path){
            let { operator, argument } = path.node;
            let Type = Prop, 
                name = null;

            if(operator == "!"){
                let bool = true;
                if(t.isUnaryExpression(argument, {operator: "!"}))
                    bool = false, argument = argument.argument;
                if(argument.type != "Identifier")
                    throw path.buildCodeFrameError("Bad Boolean Prop: must be an identifier denoting prop name. `!prop` for true and `!!prop` for false")

                name = argument;
                argument = t.buildCodeFrameError(bool)
            } 
            else if(operator == "~")
                Type = Style

            return new Type(name, argument)
        },

        DoExpression(path){
            if(this.body) throw path.buildCodeFrameError("Do Expression was already declared!")
            this.body = path;
            path.node.meta = this;
        },

        SpreadElement(path){
            const arg = path.node.argument;
            let spread = "inclusion"
            if(t.isIdentifier(arg))
                spread = arg.name;
            throw path.buildCodeFrameError(`Spread Element depreciated, use \`+${spread}\` instead.`)
        }
    }
}

export class ComponentInline extends ComponentInlineConstruct {

    groupType = "inner"

    constructor(path, parent){
        super(path, parent)
        this.props = []
        this.style = []
        this.classList = []
        this.sequenceIndex = 0
    }

    insertDoIntermediate(){ /*ExternalProps does binding to existing one.*/ }

    didEnterOwnScope(path){
        super.didEnterOwnScope(path)
    }

    typeInformation(){
        let elementType = ELEMENT_TYPE_DEFAULT;
        const classList = [];
        const included = [];

        for(const item of this.classList){
            const {name} = item;
            const include = this.use[name];

            if(include) included.push(...include.children)
            else if(item.head == true){
                const type = /^[A-Z]/.test(name)
                    ? t.identifier : t.stringLiteral
                elementType = type(name);
            }
            else classList.push(name)
        }

        return { elementType, classList, included }
    }

    outputAccumulating(scope){
        if(!this.body)
            return {
                product: this.outputInline
            }

        const { elementType, classList, included } = this.typeInformation();

        const _init = [];
        let _style, _props, _props_init = [];
        let _directPropertiesArgument;

        if(this.style.length){
            _style = scope.generateUidIdentifier("s");
            _init.push(
                t.variableDeclarator(_style, t.objectExpression([]))
            )
        }
        if(this.props.length){
            _props = scope.generateUidIdentifier("p");
            _init.push(
                t.variableDeclarator(_props, t.objectExpression([]))
            )
            _directPropertiesArgument = _props;
        }
        else {
            const init_props = _style ? 
                [ t.objectProperty(t.identifier("props"), _style) ] :
                [ /*empty*/ ];
            _directPropertiesArgument = t.objectExpression(init_props);
        }

        const _quoteTarget = { props: _props, style: _style };
        const onIncorperatedProp = x => x.asAssignedTo[x.groupType];

        const stats = [];
        const { exported, body } = this.accumulatedChildren(scope, onIncorperatedProp);

        if(_init.length) stats.push(
            t.variableDeclaration("const", _init)
        )

        stats.push( ...body )

        if(_props && _style)
        stats.push(
            t.expressionStatement(
                t.assignmentExpression("=",
                    t.memberExpression(_props, t.identifier("style")), _style
                )
            )
        )

        const product =
            transform.createElement(
                elementType, _directPropertiesArgument, ...exported
            )

        return {product, factory: stats};
    }

    output(){
        return this.outputInline();
    }

    get outputInline(){
        const { included, elementType, classList } 
            = this.typeInformation();

        let { inner, style, props } = this;

        const inline = x => x.asProperty;
        inner = inner.map(x => x.outputInline)
        props = props.map(inline)

        if(style.length) props.push(
            t.objectProperty(
                t.identifier("style"),
                t.objectExpression(
                    style.map()
                )
            )
        )

        if(classList.length) props.push(
            t.objectProperty(
                t.identifier("className"),
                t.stringLiteral(classList.reverse().join(" "))
            )
        )

        return transform.createElement(
            elementType, t.objectExpression(props), ...inner
        )
    }

    renderDynamicStatements(){
        const {use} = this;
        const {args: _args, props: _props, style: _style} = use._accumulate

        let init = [
            t.variableDeclarator( _props, t.objectExpression([]) ),
            t.variableDeclarator( _args,  t.arrayExpression([
                this._type, _props
            ]))
        ]

        const stats = this.collateChildren();

        if(this.doesInvokeStyle){
            init.push(
                t.variableDeclarator( _style, t.objectExpression([]) ),
            )
            stats.push(
                t.expressionStatement(
                    t.assignmentExpression("=", 
                        t.memberExpression(_props, t.identifier("style")), _style
                    )
                )

            )
        } 

        return [
            t.variableDeclaration("const", init),
            ...stats
        ]
    }

    renderDynamicInline(){
        return transform.IIFE(statements)
    }
}

