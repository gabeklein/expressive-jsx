export default function babel_plugin_inferred_react_component(options){
    return {
        visitor: {
            Program: {
                enter(path, state){
                    state.ref_component = path.scope.generateUidIdentifier("_component");
                },
                exit(path, state){
                    const { body } = path.scope.block;
                    const { reactRequires = "react" } = options;

                    // const reactRequired = t.objectProperty(t.identifier("Component"), state.ref_component)
                    const reactRequired = t.importSpecifier(state.ref_component, t.identifier("Component"))
                    
                    const existingImport = body.find(
                        statement => statement.source && statement.source.value == reactRequires
                    )
                    
                    if(existingImport)
                        existingImport.specifiers.push(reactRequired)
                    else 

                    body.unshift(
                        // requirement(reactRequires, [reactRequired])
                        t.importDeclaration(
                            [reactRequired], t.stringLiteral(reactRequires)
                        )
                    )
                }
            },
            Class: {
                enter(path, state){
                    if(isClassComponent(path, this.opts)){
                        state.extention_used = true;
                        polyfillComponent(path, state.ref_component)
                    }
                }
            }
        }
    }
}

const t = require("babel-types");

function requirement(from, destructure){
    return t.variableDeclaration("const", [
        t.variableDeclarator(
            t.objectPattern(destructure), 
            t.callExpression(
                t.identifier("require"), [
                    t.stringLiteral(from)
                ]
            )
        )
    ])
}

function isClassComponent(path, opts){
    const alreadyExtended = path.get("superClass");

    if(alreadyExtended.isNullLiteral()){
        path.node.superClass = null;
        return false;
    }

    return path.node.body.body.find(
        function(x){
            const {name} = x.key;
            return x.type == "ClassMethod" 
                    && name == "render" 
                || opts.activeOnMethodDo != false  
                    && name == "do"
                || path.node.id
                    && name == path.node.id.name
        }
    )
}

function polyfillComponent(path, _component){
    path.node.superClass = _component;
    path.get("body.body").find(
        x => {
            const {type, key, params} = x.node;
            if(type == "ClassMethod")
            if(key.name == "constructor")
            try {
                const body = x.get("body.body");
                if(
                    !body.find(path => {
                        try {
                            return path.get("expression.callee").isSuper()
                        } catch(e) {
                            return false;
                        }
                    })
                ) {
                    throw new Error("well ok then")
                    let _props = params[0];
                    let _struct;
                    if(!_props || (_props.type == "ObjectPattern")){
                        _struct = _props
                        _props = params[0] = x.scope.generateUidIdentifier("props")
                    }

                    if(_struct)
                        x.scope.push({
                            type: "const",
                            id: _struct,
                            init: _props
                        })

                    body[0].insertBefore(
                        t.expressionStatement(
                            t.callExpression(
                                t.identifier("super"), [_props]
                            )
                        )
                    )
                }
            } catch(e) { return false }  
        }
    )    
}