export default function babel_plugin_inferred_react_component(){
    return {
        visitor: {
            Class: {
                enter: classMayBeComponent
            }
        }
    }
}

const t = require("babel-types");

const componentAST = 
    t.memberExpression(
        t.identifier("React"),
        t.identifier("Component")
    )

function classMayBeComponent(path, _state){
    let classIsConsideredComponent = false;

    for(const property of path.get("body.body")){
        if( property.isClassMethod() ){
            switch(property.get("key.name").node){
                case "render":
                    classIsConsideredComponent = true;
                case "do":
                    if(this.opts.activeOnMethodDo != false)
                        classIsConsideredComponent = true;
            }
        }
    }

    if(classIsConsideredComponent){
        const alreadyExtends = path.get("superClass");
        if(alreadyExtends.isNullLiteral())
            path.node.superClass = null;
        else if(alreadyExtends.node == null)
            path.node.superClass = componentAST
    }
}