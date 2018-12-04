import {
    Path
} from "./types";

import {
    Identifier,
    Class,
    LabeledStatement,
    DoExpression,
    ClassMethod,
    ObjectProperty,
    BlockStatement,
    RestElement,
    PatternLike,
} from "@babel/types";

import {
    Opts,
    Shared,
    transform,
    ensureUIDIdentifier,
    ElementModifier,
    StackFrame,
    ComponentEntry,
    ApplyModifier
} from "./internal";

import * as t from "@babel/types";

export function enter(path: Path<Class>, state: any){

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
        Shared.stack.styleRoot = null;
        Shared.stack.classComponentsNamed = subComponents.map(
            x => (x.node.key as Identifier).name
        );

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

export function exit(path: Path<Class>, state: any){
    if(Shared.stack.currentlyParsingClass == path)
        Shared.stack.pop();
}


class ComponentMethod extends ComponentEntry {

    attendantComponentNames: string[];
    methodNamed: string;
    isRender?: true;

    constructor(
        name: string, 
        path: Path<ClassMethod>, 
        subComponentNames: string[] ){

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
                    path.get("params.0.right") as Path
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
                init: transform.ensureArray( transform.member(props, "children") )
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
        this.sequence.splice(0, 0, ...insertStats);
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

    LabeledStatement(path: Path<LabeledStatement>){
        if(path.node.body.type == "ExpressionStatement")
            throw path.buildCodeFrameError("Only modifier declarations are allowed here")

        ApplyModifier(this as any, path);
    }
}