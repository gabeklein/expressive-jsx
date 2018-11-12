export default function babel_plugin_inferred_react_component(options){

    const { reactRequires = "react" } = options;

    return {
        visitor: {
            Program: {
                enter(path, state){
                    const { body } = path.scope.block;
                    let existing;

                    if(existing = state.existing_import = body.find(
                        (statement, index) => statement.type == "ImportDeclaration" && statement.source.value == reactRequires
                    )){
                        if(existing = existing.specifiers.find(
                            x => x.type == "ImportSpecifier" && x.local.name == "Component")
                        ){
                            state.ref_component = existing.local;
                            state.component_import_exists = true;
                            return
                        } 
                    }
                    state.ref_component = createBinding.call(path.scope, "Component");
                },
                exit(path, state){
                    const { body } = path.scope.block;

                    const { existing_import } = state;
                    
                    if(!state.extention_used || state.component_import_exists)
                        return

                    const reactRequired = t.objectProperty(t.identifier("Component"), state.ref_component)
                    const reactImport = t.importSpecifier(state.ref_component, t.identifier("Component"))

                    if(existing_import)
                        existing_import.specifiers.push(reactImport)
                    else 
                        body.unshift(
                            // requirement(reactRequires, [reactRequired])
                            t.importDeclaration(
                                [reactImport], t.stringLiteral(reactRequires)
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

function createBinding(name = "temp"){
    name = t.toIdentifier(name).replace(/^_+/, "").replace(/[0-9]+$/g, "");
    let uid;
    let i = 0;

    do {
      uid = name + (i > 1 ? i : "");
      i++;
    } while (this.hasLabel(uid) || this.hasBinding(uid) || this.hasGlobal(uid) || this.hasReference(uid));

    const program = this.getProgramParent();
    program.references[uid] = true;
    program.uids[uid] = true;
    return t.identifier(uid);
}

const t = require("@babel/types");

function repairConstructor(constructor, params){

    const body = constructor.node.body.body;
    let superAt, thisFirstUsedAt, thisFirstUsedTimes = 1;


    for(let item, i = 0; item = body[i]; i++){
        if(item.type != "ExpressionStatement") continue;
            item = item.expression
        if(item.type != "CallExpression") continue;
            item = item.callee
        if(item.type == "Super"
        || item.type == "Identifier"
        && item.name == "super"){
            superAt = i;
            break;
        } 
        else continue;
    }

    for(
        let item, i = 0, stopAt = superAt || body.length; 
        i < stopAt;
        i++
    ){
        let item = body[i];

        if(item.type != "ExpressionStatement") continue;
        item = item.expression

        if(item.type == "CallExpression"){
            if(!item.arguments.find(
                arg => arg.type == "ThisExpression"
            )) continue;
        }
        else {
            if(item.type != "AssignmentExpression") continue;
            item = item.left
            
            if(item.type != "MemberExpression") continue; 
            item = item.object

            if(item.type != "ThisExpression") continue;
        }

        if(thisFirstUsedAt === undefined)
            thisFirstUsedAt = i;
        else
            thisFirstUsedTimes++
    }

    const format = body;

    if(thisFirstUsedAt < superAt){
        const probablyClassParams = format.splice(thisFirstUsedAt, thisFirstUsedTimes);

        format.splice(superAt + 1, 0, ...probablyClassParams); 
    }
    else if(superAt === undefined){
        let _props = params[0];
        let _struct;

        if(!_props || (_props.type == "ObjectPattern")){
            _struct = _props
            _props = params[0] = constructor.scope.generateUidIdentifier("props")
        }

        if(_struct)
            constructor.scope.push({
                type: "const",
                id: _struct,
                init: _props
            })

        format.splice(thisFirstUsedAt || 0, 0,
            t.expressionStatement(
                t.callExpression(
                    t.super(),
                    [_props]
                )
            )
        );
    }
    else return;
}


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
    if(alreadyExtended.node)
        return false;

    return path.node.body.body.find(
        function(x){
            const {name} = x.key;
            return x.type == "ClassMethod" 
                && opts.activeOnMethodRender != false  
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

    for(const statement of path.get("body.body")){
        const {type, key, params} = statement.node;
        if(type == "ClassMethod" && key.name == "constructor")
            repairConstructor(statement, params)
        
    }  
}