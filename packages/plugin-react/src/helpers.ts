import t, { Statement } from "@babel/types"
import { Scope } from '@babel/traverse';
import { createHash } from 'crypto';

export function hash(data: string, length?: number){
    return (
        createHash("md5")
        .update(data)
        .digest('hex')
        .substring(0, 6)
    )
} 

export function ensureUIDIdentifier(
    scope: Scope,
    name: string = "temp"){

    return t.identifier(ensureUID(scope, name))
}

export function ensureUID(
    scope: Scope,
    name: string = "temp"){

    name = name.replace(/^_+/, "").replace(/[0-9]+$/g, "");
    let uid;
    let i = 0;

    do {
        uid = name + (i > 1 ? i : "");
        i++;
    } 
    while (
        scope.hasBinding(uid) || 
        scope.hasGlobal(uid) || 
        scope.hasReference(uid)
    );

    const program = scope.getProgramParent() as any;
    program.references[uid] = true;
    program.uids[uid] = true;
    return uid;
}

export function findExistingImport(body: Statement[], MODULE: string){
    for(const statement of body){
        if(statement.type == "ImportDeclaration" 
        && statement.source.value == MODULE)
            return statement
    }
}