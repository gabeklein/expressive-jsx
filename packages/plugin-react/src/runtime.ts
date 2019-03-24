import template from '@babel/template';
import { Scope } from '@babel/traverse';
import t from '@babel/types';

export const fnCreateIterated = template(`
    function NAME(from, key){
        return from.length 
            ? CREATE.apply(null, [FRAG, key ? {key} : {}].concat(from))
            : false
    }
`)

export const fnExtends = template(`
    function NAME(){
        for(var item of arguments){
            if(!item) throw new Error("Included properties object is undefined!")
        }
        return Object.assign.apply(null, [{}].concat(Array.from(arguments)));
    }
`)

export const createApplied = template(`
    function NAME(from){
        return _create.apply(undefined, from);
    }
`)

export const fnBindMethods = template(`
    function expressive_methods(instance, methods) {
        for(var name of methods){
            instance[name] = instance[name].bind(instance)
        }
    }
`)

export const fnSelect = template(`
    function NAME() {
        var output = "";
        for(var classname of arguments)
            if(typeof classname == "string")
                output += " " + classname;
        return output.substring(1)
    }
`)

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
    return t.identifier(uid);
}