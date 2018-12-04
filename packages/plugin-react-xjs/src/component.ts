import {
    Path,
    Scope,
    ElementItem, 
    XReactTag,
    BunchOf
} from "./types";

import {
    ExpressionStatement,
    Expression,
    Statement,
    IfStatement,
    ArrayExpression,
    StringLiteral,
    TemplateLiteral,
    ForInStatement,
    ForOfStatement,
    LabeledStatement,
    AssignmentExpression,
    ObjectProperty,
    DoExpression
} from "@babel/types";

import { 
    ExplicitStyle,
    InnerStatement,
    NonComponent,
    IncludeComponentStatement,
    ElementInline,
    ComponentSwitch,
    ComponentRepeating,
    ApplyModifier,
    transform, Shared,
    StackFrame,
    AnyForStatement
 } from "./internal"

import * as t from "@babel/types";

import { createHash } from 'crypto';
import { Opts } from "./shared";
import { Props, Attribute, SpreadProp, Styles } from "./item";

abstract class TraversableBody {

    context = {} as StackFrame;
    parent: any;

    didEnter?(path?: Path): void;
    didExit?(path?: Path): void;

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
        
        if(this.didEnter)
            this.didEnter(path);

        for(const item of path.get("body").get("body"))
            if(item.type in this) 
                (this as any)[item.type](item);
            else throw item.buildCodeFrameError(`Unhandled node ${item.type}`)
    }

    didExitOwnScope(path: Path<DoExpression>){
        if(this.didExit)
            this.didExit(path);
            
        this.context.pop();
    }
}

export abstract class AttrubutesBody 
    extends TraversableBody {

    props = [] as unknown as Props[] & BunchOf<Props>;
    style = [] as unknown as Styles[] & BunchOf<ExplicitStyle>;
    uniqueClassname?: string;
    sequence = [] as ElementItem[];
    hasStaticProps?: true;
    hasStaticStyle?: true;

    apply(item: Attribute){
        const { name } = item;
        const list = item instanceof ExplicitStyle
            ? this.style
            : this.props;

        const existing = list[name];
        if(existing) existing.overriden = true;
        list[name] = item;
        list.push(item);
    }

    insert(item: ElementItem){
        this.sequence.push(item);
    }

    // computeStyles(){
    //     return t.objectProperty(
    //         t.stringLiteral(this.selector || this.uniqueClassname!), 
    //         // t.objectExpression(this.compileStyleObject)
    //         t.stringLiteral(this.compileStyle())
    //     )
    // }

    get selector(): string {
        return this.uniqueClassname!;
    }

    compileOutput(): ObjectProperty[] {
        const output = [] as ObjectProperty[];
        for(const name in this.style){
            const value = this.style[name];
            if(value.node) continue;
            output.push(value.toProperty())
        }
        return output;
    }

    compileStyle(): string {
        let compiled = [];

        for(const name in this.style){
            const value = this.style[name];

            if(value.node) continue;
            compiled.push(value.toString());
        }
        return compiled.join(" ")
    }

    LabeledStatement(path: Path<LabeledStatement>){
        ApplyModifier(this, path);
    }

    AssignmentExpression(path: Path<AssignmentExpression>){
        const left = path.get("left");
        
        if(!left.isIdentifier())
            throw left.buildCodeFrameError("Assignment must be identifier name of a prop.")

        const right = path.get("right").node;

        const { name } = left.node;
        const { operator } = path.node;

        let item: Styles;

        if(operator == "=") 
            path.buildCodeFrameError("Only `=` assignment may be used here.")

        if(name == "style")
            this.style.push(
                item = new SpreadProp(name, right)
            );
        else 
            this.apply(
                item = new ExplicitStyle(name, right)    
            )

        this.insert(item);
    }
}

export abstract class ComponentGroup 
    extends AttrubutesBody {

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

    // flagDisordered(){
    //     this.add = super.add;
    //     //disable check since no longer needed
    //     this.disordered = true;
    //     this.doesHaveDynamicProperties = true;
    // }

    get style_path(){
        return [`${this.uniqueClassname || this.generateUCN()}`]
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

    insertDoIntermediate(path: Path, node?: Statement){
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

        for(const item of this.sequence){
            const type = item.inlineType;

            if(type == "attrs") continue;

            if(type == "child"){
                const { product, factory } = (item as any).transform();

                if(!factory && product){
                    adjacent = adjacent.concat(product);
                    continue;
                } else {
                    if(product) {
                        flushInline();
                        output.push(product);
                    }
                    body.push(...factory)
                }
            }

            else if(type == "stats"){
                flushInline();
                const out = (item as any).output()
                if(out) body.push(out)
            }

            else if(onAppliedType){
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

    ExpressionStatement(this: BunchOf<Function>, path: Path<ExpressionStatement>){
        const expr = path.get("expression");
        if(expr.type in this) this[expr.type](expr);
        else if(this.ExpressionDefault) this.ExpressionDefault(expr);
        else throw expr.buildCodeFrameError(`Unhandled expressionary statement of type ${expr.type}`)
    }

    ExpressionDefault(path: Path<Expression>){
        IncludeComponentStatement(this, path)
    }

    VariableDeclaration(path: Path<Statement>){ 
        this.insert(new InnerStatement(path))
    }

    DebuggerStatement(path: Path<Statement>){ 
        this.insert(new InnerStatement(path))
    }

    BlockStatement(path: Path<Statement>){ 
        this.insert(new InnerStatement(path))
    }

    StringLiteral(path: Path<StringLiteral | TemplateLiteral>){
        const element = new ElementInline();
        element.parent = parent;
        element.context = Object.create(this.context);
        element.parentDeclaredAll = this.context.allMod;
        element.tags.push(
            { name: "string" }, 
            { name: Opts.reactEnv == "native" ? Shared.stack.helpers.Text : "span", 
              head: true }
        );
        element.sequence.push(new NonComponent(path));
        this.sequence.push(element);
    }

    TemplateLiteral(path: Path<TemplateLiteral>){
        this.StringLiteral(path);
    }

    ArrayExpression(path: Path<ArrayExpression>){
        for(const inclusion of path.get("elements"))
            this.add(
                new NonComponent(inclusion as any)
            )
    }

    IfStatement(path: Path<IfStatement>){
        this.add(new ComponentSwitch(path, this));
    }

    ForStatement(path: Path<AnyForStatement>){
        this.add(new ComponentRepeating(path, this))
    }

    ForInStatement(path: Path<ForInStatement>){
        this.ForStatement(path);
    }

    ForOfStatement(path: Path<ForOfStatement>){
        this.ForStatement(path);
    }

    EmptyStatement(){
        void 0;
    };
}