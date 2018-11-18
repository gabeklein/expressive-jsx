import * as t from "@babel/types";
import { Identifier, Class, Expression, LabeledStatement, DoExpression, ClassMethod, ObjectProperty, BlockStatement, ArrowFunctionExpression, Statement, ReturnStatement, RestElement, PatternLike } from "@babel/types";
import { Opts, Shared, transform, ensureUIDIdentifier } from "./shared";
import { GeneralModifier, ElementModifier } from "./modifier";
import { ElementInline } from "./inline";
import { NodePath as Path } from "@babel/traverse";
import { StackFrame } from "./scope";

const NAME_FROM = {
    VariableDeclarator: "id",
    AssignmentExpression: "left",
    AssignmentPattern: "left",
    ObjectProperty: "key"
} as {
    [type: string]: string
}

const ensureArray = (children: Expression, getFirst: boolean = false) => {
    const array = t.callExpression(
        t.memberExpression(
            t.arrayExpression([]),
            t.identifier("concat")
        ),
        [children]
    )
    return getFirst ? t.memberExpression(array, t.numericLiteral(0), true) : array;
}

export class DoComponent {
    static enter(path: Path<DoExpression>, state:any){

        let node = path.node as any,
            { meta } = node;

        if(node.expressive_visited) return

        if(!meta){

            let immediateParent = path.parentPath;
            let Handler: any;

            if(immediateParent.isArrowFunctionExpression()){
                Handler = ComponentArrowExpression;
                immediateParent = immediateParent.parentPath;
            } 
            else if((path.getAncestry()[3] || 0).type == "ArrowFunctionExpression"){
                Handler = ComponentArrowExpression;
                immediateParent = path.getAncestry()[3];
            }
            else if(!immediateParent.isSequenceExpression()){
                Handler = ComponentInlineExpression;
            }
            else { 
                const isWithin = path
                    .getAncestry()
                    .find(x => ["ArrowFunctionExpression", "ClassMethod"].indexOf(x.type) >= 0 );
                if(isWithin)
                    isWithin.buildCodeFrameError(
                        "Component Syntax `..., do {}` found outside expressive context! Did you forget to arrow-return a do expression?"
                    )
            }

            let { type, node: parent } = immediateParent;
            let name;

            switch(type){
                case "ExportDefaultDeclaration":
                    name = "default";
                    break;

                case "ReturnStatement": 
                    name = "returned";
                    break;

                case "SequenceExpression":
                    name = "callback";
                    break;

                default: {
                    let ident = (parent as any)[NAME_FROM[type]];
                    name = ident && ident.name;
                    if(!name){
                        if(parent.type == "FunctionExpression")
                            for(const { node } of path.getAncestry()){
                                if(node.type == "VariableDeclarator"){
                                    ({ name } = node.id as Identifier);
                                    break;
                                }
                            }
                        else name = "do"
                    }
                }
            }

            meta = node.meta = new Handler(path, name)
        }

        meta.didEnterOwnScope(path)

        state.expressive_used = true;
    }

    static exit(path: Path<DoExpression>, state:any){
        const node = path.node as any;

        if(node.expressive_visited) return
        else node.expressive_visited = true;

        if(!node.meta) debugger

        node.meta.didExitOwnScope(path)
    }
}

export class ComponentClass {
    static enter(path: Path<Class>, state: any){

        const doFunctions = [] as Path<ClassMethod>[];
        const subComponents = [];
        // let componentStyles;
        // let constructor;
        let styleMethod;

        for(let item of path.get("body.body") as Path<ClassMethod>[]){
            if(item.type !== "ClassMethod") continue;

            const method = item.node;

            // if(method.kind == "constructor")
            //     constructor = item
            // else 
            if(method.kind == "method"){
                if(method.key.type == "Identifier"){
                    const { name } = method.key;
                    
                    if(name == "do" || path.node.id && path.node.id.name == name)
                        doFunctions.push(item)

                    else if(name == "Style")
                        styleMethod = item as Path<ClassMethod>

                    else if(/^[A-Z]/.test(name))
                        subComponents.push(item)
                }
            }
        }

        if(doFunctions.length) {
            const modifierInsertions = [] as any[];
            const current = {
                classContextNamed: path.node.id && path.node.id.name || "Anonymous",
                stats: modifierInsertions
            }

            Shared.stack.push(current);
            Shared.stack.currentlyParsingClass = path;
            Shared.stack.modifierInsertions = modifierInsertions
            Shared.stack.classComponentsNamed = subComponents.map(
                x => (x.node.key as Identifier).name
            );
            Shared.stack.styleRoot = null;

            if(styleMethod)
                new ComponentStyleMethod(styleMethod);

            const [ render, anothaOne ] = doFunctions;
            const subComponentNames = [] as string[];

            if(anothaOne)
                throw anothaOne.buildCodeFrameError("multiple do methods not supported");

            for(const path of subComponents){
                const { name } = path.node.key as Identifier;
    
                subComponentNames.push(name);
    
                new ComponentMethod(
                    name, path, subComponentNames
                );
            }

            new ComponentMethod("render", render, subComponentNames);

            state.expressive_used = true;
        }
    }

    static exit(path: Path<Class>, state: any){
        if(Shared.stack.currentlyParsingClass == path)
            Shared.stack.pop();
    }
}

export class ComponentEntry extends ElementInline {

    stats_excused = 0;

    add(obj: any){
        super.add(obj)
        if(!this.precedent && obj.inlineType == "stats")
            this.stats_excused++;     
    }

    init(path: Path<Expression>){
        this.context.styleRoot = this;
        this.context.scope 
            = this.scope 
            = (path.get("body") as Path<BlockStatement>).scope;
    }
    
    outputBodyDynamic(){
        let body: Statement[] | undefined;
        let output;
        const { style, props } = this;

        if(
            style.length || 
            this.typeInformation.installed_style.length ||  
            this.mayReceiveExternalClasses || 
            this.style_static.length || 
            props.length
        ){
            ({ 
                product: output, 
                factory: body
            } = this.build()); 
        }
        else {
            ({ body, output } = this.collateChildren());
            output = this.bundle(output)
        }

        return (body || []).concat(
            t.returnStatement(
                output
            )
        )
    }

    bundle(output: any[]){
        return output.length > 1
            ? transform.createFragment(output)
            : output[0] || t.booleanLiteral(false)
    }
}

class ComponentMethod extends ComponentEntry {

    attendantComponentNames: string[];
    methodNamed: string;
    isRender?: true;

    constructor(
        name: string, 
        path: Path<ClassMethod>, 
        subComponentNames: string[]
    ){
        super();
        this.attendantComponentNames = subComponentNames;
        this.methodNamed = name;
        if(name == "render"){
            this.isRender = true; 
            name = Shared.stack.current.classContextNamed;
        }
        this.tags.push({ name });
        this.insertDoIntermediate(path)
    }

    bindRelatives(body: Path<BlockStatement>){
        // const name = this.methodNamed;
        const src = body.getSource();

        const bindRelatives = this.attendantComponentNames.reduce(
            (acc: ObjectProperty[], name: string) => {
                if(new RegExp(`[^a-zA-Z_]${name}[^a-zA-Z_]`).test(src)){
                    const id = t.identifier(name);
                    acc.push(
                        t.objectProperty(id, id, false, true)
                    )
                }
                return acc;
            }, []
        )

        if(bindRelatives.length)
            if(this.isRender){
                body.scope.push({
                    kind: "const",
                    id: t.objectPattern(bindRelatives),
                    init: t.thisExpression()
                })
            } 
            else throw new Error("fix WIP: no this context to make sibling elements visible")
    }

    insertDoIntermediate(path: Path<ClassMethod>){
        const doExpression = t.doExpression(path.node.body);
              (doExpression as any).meta = this;

        const body = path.get("body") as Path<BlockStatement>;

        this.bindRelatives(body);

        const { params } = path.node;
        let props = params[0];
        let destruct;
        let ref_children;

        if(props){
            destruct = props;
            if(props.type == "AssignmentPattern")
                throw (
                    path.get("params.0.right") as Path<any>
                ).buildCodeFrameError(
                    "This argument will always resolve to component props"
                );
        } 

        if(params.length > 1){
            if(props && props.type != "Identifier")
                props = ensureUIDIdentifier.call(path.scope, "props") as Identifier;

            const argumentChildren = params.slice(1);
            // const count = argumentChildren.length;
            const childrenDestruct = argumentChildren[0].type == "RestElement"
                ? (
                    argumentChildren[0] as RestElement
                  ).argument
                : t.arrayPattern(
                    argumentChildren as PatternLike[]
                  )

            ref_children = {
                kind: "const", id: childrenDestruct, unique: !Opts.compact_vars,
                init: ensureArray( transform.member(props, "children") )
            }
        }
        
        if(ref_children) body.scope.push(ref_children);

        if(props && props !== destruct)
            body.scope.push({
                kind: "const", id: destruct, init: props, unique: !Opts.compact_vars
            })

        if(props && this.isRender){
            if(props.type == "Identifier"){
                let select_props = props.name !== "props" && t.identifier("props");
                body.scope.push({
                    kind: "const", id: t.objectPattern([t.objectProperty(select_props || props, props, false, !select_props)]),
                    init: t.identifier("this"), unique: !Opts.compact_vars
                })
            }
            else
                body.scope.push({
                    kind: "const", id: props, unique: !Opts.compact_vars,
                    init: transform.member("this", "props")
                })
        }

        const replacement: ClassMethod = t.classMethod(
            "method", 
            t.identifier(this.methodNamed), 
            this.isRender ? [] : [props],
            t.blockStatement([
                t.returnStatement(doExpression)
            ])
        );

        (path as any).replaceWith(replacement)
    }

    didEnterOwnScope(path: Path<DoExpression>){
        super.didEnterOwnScope(path)
        for(const name of this.attendantComponentNames)
            this.context["_" + name] = null
    }

    didExitOwnScope(path: Path<DoExpression>){

        const insertStats = this.context.modifierInsertions;
        this.children.splice(0, 0, ...insertStats);
        for(const item of insertStats)
            this.context.styleRoot.computedStyleMayInclude(item);

        super.didExitOwnScope(path, true)
        path.parentPath.replaceWithMultiple(this.outputBodyDynamic())
    }
}

class ComponentStyleMethod {

    context: StackFrame;

    constructor(path: Path<ClassMethod>) {
        // this.insertDoIntermediate(path);
        this.context = Shared.stack;

        const src = path.get("body").get("body");
        for(const item of src)
            if(item.type in this) 
                (this as any)[item.type](item);
            else throw item.buildCodeFrameError(`Unhandled node ${item.type}`)

        path.remove();
    }

    includeModifier(mod: ElementModifier){
        this.context.declare(mod);
        mod.declareForComponent(this as any);
    }

    add(mod: ElementModifier){
        this.context.current.stats.push(mod)
    }

    LabeledStatement(path:Path<LabeledStatement>){
        if(path.node.body.type == "ExpressionStatement")
            throw path.buildCodeFrameError("Only modifier declarations are allowed here")

        GeneralModifier.applyTo(this as any, path);
    }
}

class ComponentArrowExpression extends ComponentEntry {

    constructor(path: Path<DoExpression>, name: string) {
        super();
        this.tags.push({ name })
    }

    insertDoIntermediate(path: Path<DoExpression>){
        (path.node as any).meta = this;
    }

    didExitOwnScope(path: Path<DoExpression>){
        const parentFn = path.getAncestry().find((x: Path) => x.type == "ArrowFunctionExpression") as Path<ArrowFunctionExpression>, 
            { node } = parentFn, 
            { params } = node, 
            [ props ] = params;

        let body = this.outputBodyDynamic();

        if(props && props.type == "AssignmentPattern"){
            const right = parentFn.get("params.0.right") as Path;
            throw right.buildCodeFrameError(
                "This argument will always resolve to component props") 
        }
        
        if(params.length > 1){
            let args = params.slice(1);
            let count = args.length;
            let ident;

            let assign: RestElement | Identifier = count > 1 
                ? t.arrayPattern(args as any) : args[0] as any;
                
            if(assign.type == "RestElement")
                assign = assign.argument as Identifier, count++;
    
            if(props.type == "ObjectPattern")
                props.properties.push(
                    t.objectProperty(
                        t.identifier("children"), 
                        count > 1
                            ? ident = path.scope.generateUidIdentifier("children")
                            : assign
                    )
                )
            else ident = t.memberExpression(props as any, t.identifier("children"));

            if(ident)
                body.unshift(
                    transform.declare("const", assign, ensureArray(ident, count == 1))
                )
        }

        if(this.style_static || this.mayReceiveExternalClasses)
            this.generateUCN();

        const internalStatements = (parentFn.node.body as BlockStatement).body;
        if(internalStatements.length > 1)
            body.unshift(...internalStatements.slice(0, -1))

        let functionBody: Expression | Statement;
        
        if(body.length == 1 && body[0].type == "ReturnStatement")
            functionBody = (body[0] as ReturnStatement).argument as Expression;
        else
            functionBody = t.blockStatement(body)

        parentFn.replaceWith(
            t.arrowFunctionExpression(
                props ? [props] : [],
                functionBody,
                node.async
            )
        )
        this.context.pop();
    }
}
 
class ComponentInlineExpression extends ComponentArrowExpression {

    didExitOwnScope(path: Path<DoExpression>){
        const { body, output: product }
            = this.collateChildren();
            
        path.replaceWithMultiple(
            !body.length
                ? this.bundle(product)
                : [transform.IIFE(this.outputBodyDynamic())]
        )

        this.context.pop();
    }
}