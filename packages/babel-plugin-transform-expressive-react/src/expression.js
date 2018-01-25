const t = require('babel-types')

const { elementShouldSkipTransform } = require("./utility")
export { CreateComponentsFromExpression };
const { ComponentInline } = require("./element");

function CreateComponentsFromExpression(path, parent){

    if(path.node 
    && path.node.extra
    && path.node.extra.parenthesized === true)
        return {node: path.node}

    let props = [];

    if(path.isSequenceExpression())
        [path, ...props] = path.get('expressions');

    if(path.isBinaryExpression({operator: ">"})){
        props.push({type: "InnerExpression", node: path.get("right").node})
        path = path.get("left")
    }

    const stack = [{props}];

    while(path.isBinaryExpression({operator: ">>"})){
        stack[0].path = path.get("right")
        path = path.get("left")
        stack.unshift({})
    }
    stack[0].path = path;

    for(const level of stack){
        const {path, props} = level;
        let inner;

        if(elementShouldSkipTransform(path))
            inner = { ast: head.node, type: "ExpressionInline" }
        else {
            inner = new ComponentInline(parent)
            InlineProps.apply(inner, path);
            if(props) ExternalProps.apply(inner, props);
        }

        parent.include(inner);
        parent = inner;
    }
}

class InlineProps {

    static apply(element, tag){
        if(!element) debugger

        if(tag.isBinaryExpression({operator: "-"})){
            const left = tag.get("left")
            if(left.isIdentifier())
                element.prefix = left.node.name
            else
                left.buildCodeFrameError("Improper element prefix");
            tag = tag.get("right")
        }

        while(!tag.node.extra && tag.type in this)
            tag = this[tag.type].call(element, tag);

        if(tag.isIdentifier()){
            element.classList.push({name: tag.node.name, path: tag, head: true})
            // element.include("ClassName", {name: tag.node.name, path: tag, head: true})
        }

        else throw tag.buildCodeFrameError("Expression must start with an identifier")

    }
    
    static TaggedTemplateExpression(tag){
        this.add("ExpressionInline", {kind: "text", ast: tag.node.quasi})
        return tag.get("tag")
    }
    
    static CallExpression(tag, accumulator){
        const args = tag.get("arguments");
        ExternalProps.apply(this, args)
        return tag.get("callee");
    }

    static MemberExpression(tag){

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

class ExternalProps {
    static apply(target, properties){
        for(const item of properties)
            if(item.type in this)
                this[item.type].call(target, item)
            else 
                throw item.buildCodeFrameError(`Unhandled prop of type ${item.type}`)
    }

    static InnerExpression(path){
        this.add("Expr", {node: path.value})
    }

    static StringLiteral(path){
        this.InnerExpression(path);
    }

    static TaggedTemplateExpression(path){
        const 
            tag = path.get("tag"), 
            right = path.get('quasi')
        if(!tag.isIdentifier()) 
            throw tag.buildCodeFrameError("Prop must be an Identifier");
        this.add("Prop", {name: tag.node.name, node: right.node});
    }

    static AssignmentExpression(path){
        const left = path.get("left");
        if(path.get("operator").node == "="){
            if(left.isMemberExpression())
                throw left.buildCodeFrameError("Member Expressions can't be prop names");
            const {left: {name}, right} = path.node;
            this.add("Prop", {name, node: right});
        }
        else throw path.get("operator").buildCodeFrameError("Props may only be assigned with `=` or using tagged templates.");
    }

    static Identifier(path){
        this.add("Prop", {
            name: path.node.name, 
            node: path.node
        })
    }

    static UnaryExpression(path){
        let { operator, argument } = path.node;
        switch (operator) {
            case "!": {
                let bool = true;
                if(t.isUnaryExpression(argument, {operator: "!"})){
                    bool = false;
                    argument = argument.argument;
                }
                if(t.isIdentifier(argument))
                    this.add("Prop", {name: argument, node: t.booleanLiteral(bool)})
                else throw path.buildCodeFrameError("Bad Boolean Prop: must be an identifier denoting prop name. `!prop` for true and `!!prop` for false")
            }   break;
            case "+": 
                this.add("PropInclusion", {node: argument})
                break;
            case "~": 
                if(t.isIdentifier(argument))
                    this.add("StyleInclusion", {node: argument})
                else throw path.buildCodeFrameError("Bad Style Inclusion: must be an identifier referencing an object to be rest-spread into element styles")
                break
        } 
    }

    static DoExpression(path){
        if(this.body) throw path.buildCodeFrameError("Do Expression was already declared!")
        this.body = path;
        path.node.meta = this;
    }

    static SpreadElement(path){
        const arg = path.node.argument;
        let spread = "inclusion"
        if(t.isIdentifier(arg))
            spread = arg.name;
        throw path.buildCodeFrameError(`Spread Element depreciated, use \`+${spread}\` instead.`)
    }
}