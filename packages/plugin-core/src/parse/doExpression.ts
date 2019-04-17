import t, {
    ArrowFunctionExpression,
    AssignmentExpression,
    Class,
    Function,
    ObjectProperty,
    VariableDeclaration,
    VariableDeclarator,
} from '@babel/types';
import { ComponentExpression } from 'internal';
import { DoExpressive, Path, Visitor } from 'types';

import { StackFrame } from './program';

export default <Visitor<DoExpressive>> {
    enter: (path, state) => {
        const { context } = state;
        let meta = path.node.meta || 
            generateEntryElement(path, context);
        context.push(meta);
        if(meta.didEnterOwnScope)
            meta.didEnterOwnScope(path)
    },
    exit: (path, state) => {
        state.context.pop();
        const { meta } = path.node;
        if(meta.didExitOwnScope)
            meta.didExitOwnScope(path)
    }
}

function generateEntryElement(
    path: Path<DoExpressive>, 
    context: StackFrame){

    let parent = path.parentPath;
    let containerFn: Path<ArrowFunctionExpression> | undefined;

    switch(parent.type){
        case "ArrowFunctionExpression":
            containerFn = parent as Path<ArrowFunctionExpression>;
        break;

        case "ReturnStatement": 
            const container = parent.findParent(x => {
                const t = /.*Function.*/.test(x.type);
                return t
            });
            if(container.type == "ArrowFunctionExpression"){

                containerFn = container as Path<ArrowFunctionExpression>;
            }
        break;
    }

    const name = containerName(containerFn || path);
    
    return new ComponentExpression(name, context, path, containerFn);
}

function containerName(path: Path): string {
    let parent = path.parentPath;

    while(true)
    switch(parent.type){
        case "VariableDeclarator": {
            const { id } = parent.node as VariableDeclarator;
            return t.isIdentifier(id)
                ? id.name
                : (<VariableDeclaration>parent.parentPath.node).kind
        }

        case "AssignmentExpression":
        case "AssignmentPattern": {
            const { left } = parent.node as AssignmentExpression;
            return t.isIdentifier(left)
                ? left.name
                : "assignment"
        }

        case "FunctionDeclaration": 
            return path.node.id!.name;

        case "ExportDefaultDeclaration":
            return "defaultExport";
        
        case "ArrowFunctionExpression": {
            parent = parent.parentPath;
            continue;
        }

        case "ReturnStatement": {
            const ancestry = path.getAncestry();

            let within = ancestry.find((x)=> x.isFunction()) as Path<Function> | undefined;

            if(!within)
                throw new Error("wat");

            const { node } = within;
            if("id" in node && node.id)
                return node.id.name;

            if(node.type == "ObjectMethod"){
                parent = within.getAncestry()[2];
                continue
            }

            if(node.type == "ClassMethod"){
                if(!t.isIdentifier(node.key))
                    return "ClassMethod";  
                if(node.key.name == "render"){
                    const owner = within.parentPath.parentPath as Path<Class>;
                    if(owner.node.id) 
                        return owner.node.id.name;
                    else {
                        parent = owner.parentPath;
                        continue
                    }
                }
                else 
                    return node.key.name; 
            }

            parent = within.parentPath;
            continue;
        }

        case "ObjectProperty": {
            const { key } = parent.node as ObjectProperty;
            return t.isIdentifier(key)
                ? key.name
                : "property"
        }

        case "SequenceExpression": {
            const isWithin = path.findParent(
                x => ["ArrowFunctionExpression", "ClassMethod"].includes(x.type)
            );
            if(isWithin)
                throw isWithin.buildCodeFrameError(
                    "Component Syntax `..., do {}` found outside expressive context! Did you forget to arrow-return a do expression?"
                )
            else 
                return "callback";
        }

        default:
            return "do";
    }
    
}
