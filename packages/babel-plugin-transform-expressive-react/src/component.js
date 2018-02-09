const t = require("babel-types")
const Opts = require("./shared")
const { transform } = require("./shared")

const UNARY_NAMES = {
    "~": "Tilde",
    "+": "Plus",
    "-": "Minus",
    "!": "Not"
}

class TraversableBody {

    constructor(parent){
        if(!parent)
            throw new Error("TraversableBody must be initialized given parent")

        const { use } = parent;

        this.parent = parent;
        this.children = [];
        this.use = use ? Object.create(use) : {};
    }

    add(obj){
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
        const body = path.get("body.body")
        for(const item of body)
            if(item.type in this) 
                this[item.type](item);
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
        else throw arg.buildCodeFrameError(`Unhandled Unary statement of type ${type}`);   
    }

    LabeledStatement(path){
        const body = path.get("body");
        const type = `Labeled${body.type}`
        if(type in this) this[type](path); 
        else throw body.buildCodeFrameError(`Unhandled Labeled Statement of type ${type}`);
    }

}

class AttrubutesBody extends TraversableBody {

    LabeledLabeledStatement(exp){
        throw exp.get("body").buildCodeFrameError("Multiple assignment of styles not yet supported");
    }

    AssignmentExpression(path){
        Prop.applyTo(this, path)
    }

    LabeledExpressionStatement(path){
        Style.applyTo(this, path)
    }

    LabeledBlockStatement(path){
        ComponentAttributes.applyTo(this, path)
    }
}

export class ComponentAttributes extends AttrubutesBody {

    static applyTo(parent, path){
        const { name } = path.node.label;  
        parent.use[name] = new this(path, parent);
    }

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

class ComponentBody extends AttrubutesBody {

    add(obj){
        const { groupType } = obj;
        if(groupType)
            this[groupType].push(obj);
        this.children.push(obj);
    }

    ExpressionDefault(path){
        ComponentInline.applyTo(this, path)
    }

    IfStatement(path){
        ComponentSwitch.applyTo(this, path)
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

export class ComponentGroup extends ComponentBody {

    constructor(path, parent){
        super(parent || {})

        this.stats = []
        this.inner = []

        this.sequenceIndex = 0;
        this.scope = path.scope;
        this.insertDoIntermediate(path)
    }

    add(obj){
        const thisIndex = obj.precedence || 4;
        if(this.sequenceIndex > thisIndex){
            this.doesHaveDynamicProperties = true;
            this.add = super.add; //disable check since no longer needed
        }
        else if(thisIndex < 4) this.sequenceIndex = thisIndex;

        super.add(obj)
    }

    get innerOutputInline(){
        return this.inner.map( e => e.outputInline() )
    }

    accumulatedChildren(scope = this.scope, onExternalType){

        function rejectItem(){
            return false;
        }

        function flushInline(done) {
            if(inlineAdjacent == null) return;

            if(done && !exported.length){
                exported.push(...inlineAdjacent)
                return;
            }

            const name = scope.generateUidIdentifier("inl");
            let ref, stat;

            if(inlineAdjacent.length > 1) {
                stat = transform.declare("const", name, t.arrayExpression(inlineAdjacent))
                ref  = t.spreadElement(name)
            } else {
                stat = transform.declare("const", name, inlineAdjacent[0])
                ref  = name
            }

            body.push(stat)
            exported.push(ref)

            inlineAdjacent = null;
        }

        function incorperate(product, factory, body, item){
            const {scope} = item.body.get("body");
            const id = scope.generateUidIdentifier("e");
            flushInline();
            exported.push(id);
        
            // for(const binding in scope.bindings){
            //     if(!item.scope.bindings[binding]) continue;
            //     else scope.rename(binding, item.scope.generateUid(binding))
            // }

            body.push(
                transform.declare("let", id),
                t.blockStatement([
                    ...factory,
                    t.expressionStatement(
                        t.assignmentExpression("=", id, product)
                    )
                ])
            );
        }

        const body = [];
        const exported = [];
        let inlineAdjacent;

        for(const item of this.children){
            switch(item.groupType){
                case "inner": {
                    const { product, factory } = item.outputAccumulating(scope);
                    if(factory && factory.length) incorperate(product, factory, body, item)
                    else if(inlineAdjacent) inlineAdjacent.push(product);
                    else inlineAdjacent = [product]
                } break;

                case "stats":
                    flushInline();
                    body.push(
                        item.output()
                    )
                break;

                default: {
                    const add = (onExternalType || rejectItem)(item);
                    if(add){
                        flushInline();
                        body.push(add)
                    }
                }
            }
        }
        flushInline(true);

        return { exported, body }
    }

    VariableDeclaration(path){ 
        Statement.applyTo(this, path, "var")
    }

    DebuggerStatement(path){ 
        Statement.applyTo(this, path, "debug")
    }
}

export class ComponentFragment extends ComponentGroup {

    LabeledExpressionStatement(path){
        throw path.buildCodeFrameError("Styles have nothing to apply to here!")
    }

    AssignmentExpression(path){
        throw path.buildCodeFrameError("Props have nothing to apply to here!")
    }

    outputInline(inner){
        if(!inner) 
            ({ inner } = this.transformDataInline())
        return (
            inner.length >  1 ?
                transform.createFragment(inner) :
            inner.length == 1 ?
                inner[0] :
            t.booleanLiteral(false)
        )
    }
}

//imported last; modules require from this one, so exports must already be initialized.

const { Prop, Style, Statement, ChildNonComponent } = require("./item")
const { ComponentInline } = require("./inline");
const { ComponentSwitch } = require("./ifstatement");
// const { ComponentRepeating } = require("./forloop");