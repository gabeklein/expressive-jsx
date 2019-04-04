import { Scope } from '@babel/traverse';
import { createHash } from 'crypto';

export function Hash(data: string, length?: number){
    return (
        createHash("md5")
        .update(data)
        .digest('hex')
        .substring(0, 6)
    )
} 

export function ensureUIDIdentifier(
    this: Scope,
    name: string = "temp"){

    name = name.replace(/^_+/, "").replace(/[0-9]+$/g, "");
    let uid;
    let i = 0;

    do {
        uid = name + (i > 1 ? i : "");
        i++;
    } 
    while (
        this.hasBinding(uid) || 
        this.hasGlobal(uid) || 
        this.hasReference(uid)
    );

    const program = this.getProgramParent() as any;
    program.references[uid] = true;
    program.uids[uid] = true;
    return uid;
}