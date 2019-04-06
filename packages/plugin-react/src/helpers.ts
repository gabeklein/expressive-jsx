import t, { Statement, ModuleSpecifier } from "@babel/types"
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

export function ensureSpecifier(
    from: ModuleSpecifier[],
    scope: Scope,
    name: string,
    alt?: string
){
    let uid: string | undefined;

    for(const spec of from)
        if("imported" in spec 
        && spec.imported.name == name){
            uid = spec.local.name;
            break;
        }

    if(!uid){
        uid = ensureUID(scope, alt || name);
        from.push(
            t.importSpecifier(t.identifier(alt || name), t.identifier(name))
        )
    }

    return uid;
}

export function findExistingImport(body: Statement[], MODULE: string){
    for(const statement of body){
        if(statement.type == "ImportDeclaration" 
        && statement.source.value == MODULE)
            return statement
    }
}