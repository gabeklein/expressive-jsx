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
        return this.classifyChildren().output;
    }

    classifyChildren(children = this.children){
        const statements = [];
        const styles = [];
        const props = [];
        const output = [];

        const accumulate_to = {
            Statement: statements,
            StyleInclusion: styles,
            ExplicitStyle: styles,
            PropInclusion: props,
            Prop: props
        }

        for(const child of children){
            const { ast, type, node, name } = child;
            if(ast) 
                output.push(ast);
            else 
                accumulate_to[type].push(
                    type == "Statement" ? 
                        node :
                    ~type.indexOf("Inclusion") ?
                        t.spreadProperty(node) :
                        t.objectProperty(t.identifier(name), node)
                )
        }

        return {
            stats: statements,
            props,
            style: styles.length ? styles : undefined,
            contains: output,
            output: 
                output.length < 1 ? 
                    t.booleanLiteral(false) :
                output.length > 1 ? 
                    t.arrayExpression(output) :
                    output[0] 
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

    set doesHaveDynamicProperties(bool){
        this.shouldRenderDynamic = bool;
    }

    mayIncludeAccumulatingChildren(){
        this.shouldRenderDynamic = true;
    }

    VariableDeclaration(path){
        this.add("Statement", {kind: "Var", node: path.node})
    }

    DebuggerStatement(path){
        this.shouldRenderDynamic = true;
        this.add("Statement", {kind: "Debugger", node: path.node})
    }
}

export class ComponentScopedFragment extends ComponentScoped {
    LabeledExpressionStatement(path){
        path.buildCodeFrameError("Styles have nothing to apply to here!")
    }

    AssignmentExpression(path){
        path.buildCodeFrameError("Props have nothing to apply to here!")
    }
}

//imported after Component so such is available when loaded.

const { CreateComponentsFromExpression } = require("./expression");
const { ComponentSwitch } = require("./ifstatement");
const { ComponentRepeating } = require("./forloop")