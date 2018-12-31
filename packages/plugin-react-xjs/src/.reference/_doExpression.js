import {
    Path
} from "./types";

import { ElementInline, generateDoEntry } from "./internal";

import {
    DoExpression,
} from "@babel/types";

export interface DoExpressive extends DoExpression {
    meta: ElementInline;
    expressive_visited?: true;
}

interface BabelState {
    expressive_used?: true;
}

export function enter(
    path: Path<DoExpressive>, 
    state: BabelState ){

    const node = path.node;

    if(node.expressive_visited) 
        throw path.buildCodeFrameError("Internal Error: node already visited")

    const meta = node.meta || generateDoEntry(path);

    meta.didEnterOwnScope(path)

    state.expressive_used = true;
}

export function exit(
    path: Path<DoExpression>, 
    state: BabelState ){

    const node = path.node as any;

    if(node.expressive_visited)
        throw path.buildCodeFrameError("Internal Error: node already visited")
    else node.expressive_visited = true;

    if(!node.meta) debugger

    node.meta.didExitOwnScope(path)
}