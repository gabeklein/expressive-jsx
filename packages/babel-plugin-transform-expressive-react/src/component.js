const t = require("babel-types")

const { ComponentAttrubutesBody } = require("./body");

export class Component extends ComponentAttrubutesBody {

    innerAST(){
        const list = [];
        for(const child of this.children){
            const output = child.ast;
            if(output) list.push(output)
            else console.log(`skipped ${child.type}`)
        }
        switch(list.length){
            case 0: return t.booleanLiteral(false);
            case 1: return list[0]
            default: return t.arrayExpression(list);
        }
    }

    mayReceiveConditionalAttrubutes(path){
        throw path.buildCodeFrameError("Prop has nothing to apply to!")
    }

    IfStatement(path){
        this.include(
            new ComponentSwitch(path, this)
        )
    }

    ArrayExpression(path){
        for(const inclusion of path.node.elements)
            this.add("ExpressionInline", { ast: inclusion })
    }

    ExpressionDefault(path){
        CreateComponentsFromExpression(path, this);
    }

    ForStatement(path, type){ 
        this.include(
            new ComponentRepeating(path, this, type)
        )
    }

    ForOfStatement(path){
        this.ForStatement(path, "of")
    }

    ForInStatement(path){
        this.ForStatement(path, "in")
    }

    EmptyStatement(){
        return void 0;
    };
    
}

export class ComponentScoped extends Component {
    constructor(parent){
        super(parent);
        this.statements = [];
    }

    VariableDeclaration(path){
        this.add("Statement", {kind: "Var", node: path.node})
    }

    DebuggerStatement(path){
        this.add("Statement", {kind: "Debugger", node: path.node})
    }
}

//imported after Component so such is available when loaded.

const { CreateComponentsFromExpression } = require("./expression");
const { ComponentSwitch } = require("./ifstatement");
const { ComponentRepeating } = require("./forloop")