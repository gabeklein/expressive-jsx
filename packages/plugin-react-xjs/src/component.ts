import {
    Path,
    Scope,
    ExpressionStatement,
    Expression,
    Statement,
    IfStatement,
    ArrayExpression,
    StringLiteral,
    TemplateLiteral,
    ForStatement,
    ForInStatement,
    ForOfStatement,
    LabeledStatement,
    AssignmentExpression,
    VariableDeclaration,
    DebuggerStatement,
    BlockStatement,
    ObjectExpression,
    ObjectProperty,
    ExpressiveElementChild, 
    ElementInlcusion, 
    DoExpression,
    XReactTag
} from "./types";

import { 
    Prop,
    Attribute,
    ExplicitStyle,
    InnerStatement,
    NonComponent,
    CollateInlineComponentsTo,
    RNTextNode,
    ComponentSwitch,
    ComponentRepeating,
    GeneralModifier,
    transform, Shared,
    StackFrame
 } from "./internal"

import * as t from "@babel/types";

import { createHash } from 'crypto';

abstract class TraversableBody {

    context = {} as StackFrame;
    parent: any;

    init?(path: Path<Expression | Statement>): void;

    bubble(fnName: string, ...args: any[]){
        let cd = this;
        while(cd = cd.parent)
            if(fnName in cd){
                const result = (cd as any)[fnName](...args); 
                if(result !== false) return result;
            }
        throw new Error(`No method named ${fnName} in parent-chain of element ${this.constructor.name}`)
    }

    didEnterOwnScope(path: Path<DoExpression>){
        Shared.stack.push(this);
        
        if(typeof this.init == "function")
            this.init(path);

        for(const item of path.get("body").get("body"))
            if(item.type in this) 
                (this as any)[item.type](item);
            else throw item.buildCodeFrameError(`Unhandled node ${item.type}`)
    }

    didExitOwnScope(path: Path<DoExpression>){
        this.context.pop();
    }
}

export abstract class AttrubutesBody 
    extends TraversableBody {

    props = [] as Attribute[];
    style = [] as ExplicitStyle[];
    uniqueClassname?: string;
    children = [] as ElementInlcusion[];
    style_static: ExplicitStyle[];

    abstract inlineType: string;
    abstract precedence: number;

    constructor(){
        super();
        this.style_static = Shared.stack.styleMode.compile ? [] : this.style;
    }

    add(obj: ExpressiveElementChild){
        const acc = (this as any)[obj.inlineType];
        if(acc) acc.push(obj);
        this.children.push(obj);
    }

    computeStyles(){
        return t.objectProperty(
            t.stringLiteral(this.selector || this.uniqueClassname!), 
            // t.objectExpression(this.compileStyleObject)
            t.stringLiteral(this.compiledStyle)
        )
    }

    get selector(): string {
        return this.uniqueClassname!;
    }

    get style_output(): ObjectExpression {
        return t.objectExpression(this.style_static.map(x => x.asProperty));
    }

    get compiledStyle(): string {
        return this.style_static.map(x => x.asString).join("; ")
    }

    get compileStyleObject(): ObjectProperty[] {
        return this.style_static.map(x => x.asProperty)
    }

    LabeledStatement(path: Path<LabeledStatement>){
        GeneralModifier.applyTo(this, path);
    }

    AssignmentExpression(path: Path<AssignmentExpression>){
        Prop.applyTo(this, path)
    }
}

export abstract class ComponentGroup 
    extends AttrubutesBody 
    implements ExpressiveElementChild {

    stats = [] as any[];
    child = [] as any[];
    tags = [] as XReactTag[];
    precedent = 0;
    uid?: string;
    scope?: Scope;
    doTransform: any;
    disordered?: true;
    doesHaveDynamicProperties?: true;

    abstract inlineType: string;
    abstract precedence: number;

    add(obj: ExpressiveElementChild){
        const updated = obj.precedence || 4;

        if(this.precedent > updated) this.flagDisordered();
        else if(updated < 4) this.precedent = updated;

        super.add(obj)
    }

    flagDisordered(){
        this.add = super.add;
        //disable check since no longer needed
        this.disordered = true;
        this.doesHaveDynamicProperties = true;
    }

    get style_path(){
        return [`${this.uniqueClassname || this.generateUCN() }`]
    }

    generateUCN(name?: string){
        let cn = name || this.tags[this.tags.length - 1].name;

        const uid = this.uid = `${cn}-${
            createHash("md5")
                .update(this.style_static.reduce((x,y) => x + y.asString, ""))
                .digest('hex')
                .substring(0, 6)
        }`
        return this.uniqueClassname = "." + uid
    }

    insertDoIntermediate(path: Path<any>, node?: Statement){
        let content = node || path.node;
        if(content.type !== "BlockStatement")
            content = t.blockStatement([content]);

        const doTransform = t.doExpression(content);

        (doTransform as any).meta = this;
        this.doTransform = doTransform;

        const replacement = t.expressionStatement(doTransform);

        path.replaceWith(replacement);
    }

    collateChildren(
        onAppliedType?: (item: any) => any ){

        const scope = this.scope;
        const body = [] as Statement[];
        const output = [] as any[];
        // const child_props = [];
        let adjacent = [] as any[];

        function flushInline(done?: boolean) {
            // if(adjacent == null) return;
            if(adjacent.length == 0) return;

            if(done && !output.length){
                output.push(...adjacent);
                return;
            }

            const name = scope!.generateUidIdentifier("e");
            let ref, stat;

            if(adjacent.length > 1) {
                stat = transform.declare("const", name, t.arrayExpression(adjacent))
                ref = t.spreadElement(name)
            } else {
                stat = transform.declare("const", name, adjacent[0])
                ref = name
            }

            body.push(stat)
            output.push(ref)

            adjacent = [];
        }

        for(const item of this.children){
            switch(item.inlineType){

                case "self":
                case "child": {
                    // if(item.constructor.name == "QuasiComponent") debugger
                    const { product, factory } = (item as any).transform();

                    if(!factory && product){
                        adjacent = adjacent.concat(product);
                        // if(adjacent) adjacent.push(product);
                        // else adjacent = [product]
                        continue;
                    } else {
                        if(product) {
                            flushInline();
                            output.push(product);
                        }
                        body.push(...factory)
                    }
                    
                } break;
                
                case "stats": {
                    flushInline();
                    const out = (item as any).output()
                    if(out) body.push(out)

                } break;

                case "attrs": 
                    break;

                default: 
                    if(onAppliedType){
                        const add = onAppliedType(item);
                        if(add){
                            flushInline();
                            body.push(add);
                        }
                    }
            }   
        }
        
        flushInline(true);

        return { output, body }
    }

    ExpressionStatement(path: Path<ExpressionStatement>){
        const expr = path.get("expression") as Path<Expression>
        if(expr.type in this) 
            (this as any)[expr.type](expr);
        else if(this.ExpressionDefault) this.ExpressionDefault(expr);
        else throw expr.buildCodeFrameError(`Unhandled expressionary statement of type ${expr.type}`)
    }

    ExpressionDefault(path: Path<Expression>){
        CollateInlineComponentsTo(this, path)
    }

    VariableDeclaration(path: Path<VariableDeclaration>){ 
        InnerStatement.applyTo(this, path, "var")
    }

    DebuggerStatement(path: Path<DebuggerStatement>){ 
        InnerStatement.applyTo(this, path, "debug")
    }

    BlockStatement(path: Path<BlockStatement>){ 
        InnerStatement.applyTo(this, path, "block")
    }

    TemplateLiteral(path: Path<TemplateLiteral>){
        RNTextNode(this, path)
    }

    StringLiteral(path: Path<StringLiteral>){
        RNTextNode(this, path)
    }

    ArrayExpression(path: Path<ArrayExpression>){
        NonComponent.applyMultipleTo(this, path)
    }

    IfStatement(path: Path<IfStatement>){
        ComponentSwitch.applyTo(this, path)
    }

    ForStatement(path: Path<ForStatement>){
        ComponentRepeating.applyTo(this, path)
    }

    ForInStatement(path: Path<ForInStatement>){
        ComponentRepeating.applyTo(this, path, "in")
    }

    ForOfStatement(path: Path<ForOfStatement>){
        ComponentRepeating.applyTo(this, path, "of")
    }

    EmptyStatement(){};
}