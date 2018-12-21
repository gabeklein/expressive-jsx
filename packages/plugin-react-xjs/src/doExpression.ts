import { Path, BabelState, DoExpressive } from "./types";

import t, {
    ComponentExpression, 
    ComponentArrowExpression, 
    ElementInline
} from "./internal";

import { 
    VariableDeclarator,
    AssignmentExpression,
    ObjectProperty,
    VariableDeclaration,
    ArrowFunctionExpression,
} from "@babel/types";

export function enter(
    path: Path<DoExpressive>, 
    state: BabelState ){

    let meta = path.node.meta || generateEntryElement(path);

    state.context.push(meta);
    meta.didEnterOwnScope(path)
}

export function exit(
    path: Path<DoExpressive>, 
    state: BabelState ){

    state.context.pop();
    path.node.meta.didExitOwnScope(path)
}

function generateEntryElement(path: Path<DoExpressive>){
    let parent = path.parentPath;
    let containerFn: Path<ArrowFunctionExpression> | undefined;

    switch(parent.type){
        case "ArrowFunctionExpression":
            containerFn = parent as Path<ArrowFunctionExpression>;
        break;

        case "ReturnStatement": 
            const container = parent.getAncestry()[3];
            if(container.isArrowFunctionExpression())
                containerFn = container;
        break;
    }
;
    const name = containerName(containerFn || path);

    let element: ElementInline = containerFn 
        ? new ComponentArrowExpression(name, path, containerFn)
        : new ComponentExpression(name, path);

    return element;
}

function containerName(path: Path<any>): string {
    let parent = path.parentPath;

    switch(parent.type){
        case "VariableDeclarator": {
            const { id } = parent.node as VariableDeclarator;
            return t.isIdentifier(id)
                ? id.name
                : (parent.parentPath as Path<VariableDeclaration>).node.kind
        }

        case "AssignmentExpression":
        case "AssignmentPattern": {
            const { left } = parent.node as AssignmentExpression;
            return t.isIdentifier(left)
                ? left.name
                : "assignment"
        }

        case "ExportDefaultDeclaration":
            return "default";
        
        case "ArrowFunctionExpression":
        case "ReturnStatement": {
            return "returned";
        }

        case "ObjectProperty": {
            const { key } = parent.node as ObjectProperty;
            return t.isIdentifier(key)
                ? key.name
                : "property"
        }

        case "SequenceExpression": {
            const isWithin = path.findParent(
                x => ["ArrowFunctionExpression", "ClassMethod"].indexOf(x.type) >= 0
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