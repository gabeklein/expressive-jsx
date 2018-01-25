import * as t from "babel-types"

const UNARY_NAMES = {
    "~": "Tilde",
    "+": "Plus",
    "-": "Minus",
    "!": "Not"
}

export class TraversableBody {

    constructor(parent){
        if(!parent) {
            throw new Error("TraversableBody must be initialized given parent")
        }

        this.parent = parent;
        this.children = [];

        const { use } = parent;
        this.use = use ? Object.create(use) : {};
    }

    bubble(fnName, ...args){
        let cd = this;
        while(cd = cd.parent)
            if(fnName in cd){
                const result = cd[fnName](...args); 
                if(result !== false) return result;
            }
        
        throw new Error(`No method named ${fnName} in parent-chain of element ${this.constructor.name}`)
    }

    didEnterOwnScope(path, _opts){
        const body = path.get("body.body")
        for(const item of body)
            if(item.type in this) 
                this[item.type](item, _opts);
            else throw item.buildCodeFrameError(`Unhandled node ${item.type} in style block`)
            
    }

    didExitOwnScope(){
        return void 0;
    }

//  Node Type Specifiers

    ExpressionStatement(path){
        const expr = path.get("expression")
        if(expr.type in this) this[expr.type] (expr);
        else if(this.ExpressionDefault) this.ExpressionDefault(expr);
        else throw expr.buildCodeFrameError(`Unhandled expressionary statement of type ${expr.type}`)
        
    }

    UnaryExpression(path){
        const arg = path.get("argument");
        const type = UNARY_NAMES[path.node.opperator] + "Expression";
        if(type in this) this[type] (arg);
        else throw expr.buildCodeFrameError(`Unhandled Unary statement of type ${type}`);
        
    }

    LabeledStatement(path){
        const body = path.get("body");
        const type = `Labeled${body.type}`
        if(type in this) this[type](path); 
        else throw expr.buildCodeFrameError(`Unhandled Labeled Statement of type ${type}`);
    }
   
}

export class ComponentAttrubutesBody extends TraversableBody {

    add(type, obj){
        obj.type = type;
        this.include(obj);
    }

    include(obj){
        this.children.push(obj);
    }

    AssignmentExpression(path){
        const expr = path.node;
        this.add("Prop", {name: expr.left.name, node: expr.right})
    }

    LabeledBlockStatement(path){
        const { name } = path.node.label;  
        this.use[name] = new ComponentAttributes(path, this);
    }

    LabeledExpressionStatement(path){
        const { name } = path.node.label;
        let value = path.get("body.expression").node;

        if(value.extra && value.extra.parenthesized)/*do nothing*/;
        else switch(value.type){
            case "BinaryExpression":
                throw exp.buildCodeFrameError("CSS values with dash not yet supported");

            case "ArrowFunctionExpression":
                throw exp.buildCodeFrameError("Dynamic CSS values not yet supported");

            case "NumericLiteral": {
                const {extra} = value;
                if(extra && /^0x/.test(extra.raw))
                    value = t.stringLiteral(extra.raw.replace("0x", "#"))
                break;
            }

            case "SequenceExpression": {
                const {expressions: e} = value;
                let val = "";
                if(e[0].type == "NumericLiteral"){
                    val += e[0].value;
                    if(e[1].type == "Identifier")
                        val += e[1].name;
                }
                value = t.stringLiteral(val);
                break;
            }

            case "Identifier":
                value = t.stringLiteral(value.name);
            break;
        }

        this.add("ExplicitStyle", {name,  node: value});
    }

    LabeledLabeledStatement(exp){
        throw exp.get("body").buildCodeFrameError("Multiple assignment of styles not yet supported");
    }

}

export class ComponentAttributes extends ComponentAttrubutesBody {
    constructor(path, parent){
        super(parent)
        const { node } = path;

        node.meta = this;
        this.name = node.label.name;
    }

    didExitOwnScope(){
        this.parent.use[this.name] = this;
    }
}
