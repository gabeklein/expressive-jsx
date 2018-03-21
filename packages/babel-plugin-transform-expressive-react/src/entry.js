
const t = require("babel-types")
const { ComponentFragment } = require("./component")
const { Shared, transform } = require("./shared")

export function RenderFromDoMethods(renders, subs){
    let found = 0;
    const subComponentNames = subs.map(
        x => x.node.key.name
    );

    for(let path of subs){
        const { name } = path.node.key;
        new ComponentMethod(name, path, subComponentNames);
    }

    for(let path of renders){
        if(++found > 1) throw path.buildCodeFrameError("multiple do methods not (yet) supported!")
        new ComponentMethod("render", path, subComponentNames);
    }
}

export class ComponentEntry extends ComponentFragment {

    mayReceiveAttributes(style, props){
        const complainAbout = props || style;
        const description = style ? "Style" : "Prop";
        throw complainAbout.path.buildCodeFrameError(`${description} has nothing to apply to in this context!`)
    }

    didEnterOwnScope(path){
        super.didEnterOwnScope(path)
        this.context.scope 
            = this.scope 
            = path.get("body").scope;
    }

    // declareStyle(from){
    //     const id = this.scope.generateUidIdentifier("S")
    //     this.scope.push({
    //         kind: "const",
    //         id, 
    //         init: t.stringLiteral("lol")
    //     })
    //     return id;
    // }
}

class ComponentMethod extends ComponentEntry {

    constructor(name, path, subComponentNames) {
        super();
        this.attendantComponentNames = subComponentNames;
        this.methodNamed = name;
        this.insertDoIntermediate(path)
    }

    insertDoIntermediate(path){
        const doExpression = t.doExpression(path.node.body);
              doExpression.meta = this;

        const [argument_props, argument_state] = path.get("params");
        const body = path.get("body");
        const src = body.getSource();
        const name = this.methodNamed;

        const bindRelatives = this.attendantComponentNames.reduce(
            (acc, name) => {
                if(new RegExp(`\W${name}\W`).test(src)){
                    name = t.identifier(name);
                    acc.push(
                        t.objectProperty(name, name, false, true)
                    )
                }
                return acc;
            }, []
        )

        if(bindRelatives.length)
            if(name == "render"){
                body.scope.push({
                    kind: "const",
                    id: t.objectPattern(bindRelatives),
                    init: t.thisExpression()
                })
            } 
            else throw new Error("fix WIP: no this context to make sibling elements visible")


        let params = [];

        if(argument_props)
            if(name == "render"){
                if(argument_props.isAssignmentPattern())
                    argument_props.buildCodeFrameError("Props Argument will always resolve to `this.props`")

                body.scope.push({
                    kind: "var",
                    id: argument_props.node,
                    init: t.memberExpression( t.thisExpression(), t.identifier("props") )
                })
            } 
            else params = [argument_props.node]

        path.replaceWith(
            t.classMethod(
                "method", 
                t.identifier(name), 
                params,
                t.blockStatement([
                    t.returnStatement(doExpression)
                ])
            )
        )
    }

    didExitOwnScope(path){
        const { body, output }
            = this.collateChildren();

        const returned = 
            output.length > 1
                ? transform.createFragment(output)
                : output[0] || t.booleanLiteral(false)

        path.parentPath.replaceWithMultiple([
            ...body, 
            t.returnStatement(returned)
        ])
    }
}

export class ComponentFunctionExpression extends ComponentEntry {

    insertDoIntermediate(path){
        path.node.meta = this;
    }

    outputBodyDynamic(){
        const { body, output }
            = this.collateChildren();

        const returned = 
            output.length > 1
                ? transform.createFragment(output)
                : output[0] || t.booleanLiteral(false)

        return [
            ...body, 
            t.returnStatement(returned)
        ]
    }

    didExitOwnScope(path){
        const parentFn = path.parentPath;
        const {params, generator, async} = parentFn.node;

        parentFn.replaceWith(
            t.functionExpression(
                null, 
                params, 
                t.blockStatement(this.outputBodyDynamic()), 
                generator, 
                async
            )
        )
    }
}
 
export class ComponentInlineExpression extends ComponentFunctionExpression {

    didExitOwnScope(path){
        const { body, output: product }
            = this.collateChildren();

        const output = product.length > 1
            ? transform.createFragment(product)
            : product[0] || t.booleanLiteral(false)

        path.replaceWith(
            !body.length
                ? output
                : transform.IIFE([
                    ...body, 
                    t.returnStatement(output)
                ])
        )
    }
}