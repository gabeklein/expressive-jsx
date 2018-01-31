const t = require("babel-types")

const { ComponentAttrubutesBody } = require("./body");

const CHILD_SEQUENCE = {
    Statement: -1,
    Prop: 0,
    ExplicitStyle: 1,
    ForLoop: 2,
    ComponentInline: 2,
    ComponentSwitch: 3,
}

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
        this.sequenceIndex = -1
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

    VariableDeclaration(path){
        this.add("Statement", {kind: "Var", node: path.node})
    }

    DebuggerStatement(path){
        this.shouldRenderDynamic = true;
        this.add("Statement", {kind: "Debugger", node: path.node})
    }
}

//imported after Component so such is available when loaded.

const { CreateComponentsFromExpression } = require("./expression");
const { ComponentSwitch } = require("./ifstatement");
const { ComponentRepeating } = require("./forloop")