const t = require("babel-types")
const { Opts, transform } = require("./shared")

const UNARY_NAMES = {
    "~": "Tilde",
    "+": "Positive",
    "-": "Negitive",
    "!": "Anti"
}

class TraversableBody {

    children = [];

    constructor(path, parent){

        if(parent){
            this.context = Object.create(parent.context)
            this.parent = parent
        } else 
            this.context = {};

        this.insertDoIntermediate(path)
    }

    add(obj){
        const { inlineType } = obj;
        if(inlineType)
            this[inlineType].push(obj);
        this.children.push(obj);
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

    didEnterOwnScope(path){
        const src = path.get("body.body")
        for(const item of src)
            if(item.type in this) 
                this[item.type](item);
            else throw item.buildCodeFrameError(`Unhandled node ${item.type}`)
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
        const type = UNARY_NAMES[path.node.operator] + "Expression";
        if(type in this) this[type] (arg);
        else throw arg.buildCodeFrameError(`Unhandled Unary statement of type ${type}`);   
    }

    LabeledStatement(path){

        return GeneralModifier.handle(this, path);

        // const src = path.get("body");
        // const type = `Labeled${src.type}`
        // if(type in this) this[type](path); 
        // else throw src.buildCodeFrameError(`Unhandled Labeled Statement of type ${type}`);
    }

}

export class AttrubutesBody extends TraversableBody {

    props = [];
    style = [];

    AntiExpression(path){
        return
    }

    AssignmentExpression(path){
        Prop.applyTo(this, path)
    }

    // LabeledExpressionStatement(path){
    //     Style.applyTo(this, path)
    // }

    // LabeledStatement(path){

    //     if(Opts.applicationType != "native")
    //     if(~["self", "screen"].indexOf(path.node.label.name))
    //         return SpecialModifier.applyTo(this, path)
        
    //     super.LabeledStatement(path)
    // }

    // LabeledLabeledStatement(exp){
    //     throw exp.get("body").buildCodeFrameError("Cannot chain style modifiers, or whatever you're trying to do");
    // }

    // LabeledBlockStatement(path){
    //     ComponentModifier.applyTo(this, path)
    // }
}

export class Component extends AttrubutesBody {

    child = [];

    static enter(path, state){

        let { node } = path,
            { meta } = node;

        if(node.expressive_visited) return

        if(!meta){
            meta = path.parentPath.isArrowFunctionExpression()
                ? new ComponentFunctionExpression(path)
                : new ComponentInlineExpression(path)
        }

        meta.didEnterOwnScope(path)

        state.expressive_used = true;
    }

    static exit(path, state){
        const { node } = path;
        
        if(node.expressive_visited) return
        else node.expressive_visited = true;

        node.meta.didExitOwnScope(path)
    }

    ExpressionDefault(path){
        CollateInlineComponentsTo(this, path)
    }

    IfStatement(path){
        ComponentSwitch.applyTo(this, path)
    }

    StringLiteral(path){
        ChildNonComponent.applyTo(this, path)
    }

    ArrayExpression(path){
        ChildNonComponent.applyMultipleTo(this, path)
    }

    ForStatement(path, mod){
        ComponentRepeating.applyTo(this, path, mod)
    }

    ForInStatement(path){
        this.ForStatement(path, "in")
    }

    ForOfStatement(path){
        this.ForStatement(path, "of")
    }

    EmptyStatement(path){ 
        ChildNonComponent.applyVoidTo(this)
     };
    
}

export class ComponentGroup extends Component {

    stats = []
    segue = 0;

    add(obj){
        const updated = obj.precedence || 4;

        if(this.segue > updated){
            this.flagDisordered();
            this.add = super.add; //disable check since no longer needed
        }
        else if(updated < 4)
            this.segue = updated;

        super.add(obj)
    }

    flagDisordered(){
        this.disordered = true;
        this.doesHaveDynamicProperties = true;
    }

    collateChildren(onAppliedType){

        const { scope } = this;
        const body = [];
        const output = [];
        let adjacent;
        if(!scope) debugger

        const child_props = [];

        function flushInline(done) {
            if(adjacent == null) return;

            if(done && !output.length){
                output.push(...adjacent)
                return;
            }


            const name = scope.generateUidIdentifier("e");
            let ref, stat;

            if(adjacent.length > 1) {
                stat = transform.declare("const", name, t.arrayExpression(adjacent))
                ref  = t.spreadElement(name)
            } else {
                stat = transform.declare("const", name, adjacent[0])
                ref  = name
            }

            body.push(stat)
            output.push(ref)

            adjacent = null;
        }

        for(const item of this.children) 
            switch(item.inlineType){

                case "child": {
                    const { product, factory } = item.transform();

                    if(!factory){
                        if(adjacent) adjacent.push(product);
                        else adjacent = [product]
                        continue;
                    } else {
                        flushInline();
                        output.push(product);
                        body.push(...factory)
                    }
                    
                } break;
                
                case "stats": {
                    flushInline();
                    const out = item.output()
                    if(out) body.push(out)

                } break;

                case "attrs": break;

                default: 
                    if(onAppliedType){
                        const add = onAppliedType(item);
                        if(add){
                            flushInline();
                            body.push(add);
                        }
                    }
            }
        
        flushInline(true);

        return { output, body }
    }

    VariableDeclaration(path){ 
        Statement.applyTo(this, path, "var")
    }

    DebuggerStatement(path){ 
        Statement.applyTo(this, path, "debug")
    }

    BlockStatement(path){ 
        Statement.applyTo(this, path, "block")
    }
}

export class ComponentFragment extends ComponentGroup {

    // LabeledExpressionStatement(path){
    //     throw path.buildCodeFrameError("Styles have nothing to apply to here!")
    // }

    AssignmentExpression(path){
        throw path.buildCodeFrameError("Props have nothing to apply to here!")
    }
}

//import last. modules here themselves import from this one, so exports must already be initialized.

const { Prop, Style, Statement, ChildNonComponent } = require("./item");
const { CollateInlineComponentsTo } = require("./inline");
const { ComponentModifier } = require("./attributes");
const { ComponentSwitch } = require("./ifstatement");
const { ComponentRepeating } = require("./forloop");
const { ComponentInlineExpression, ComponentFunctionExpression } = require("./entry");
const { GeneralModifier } = require("./modifier");