import { ElementModifier, ModifyDelegate } from "./modifier";

export function is(this: ModifyDelegate){
    const out = { 
        attrs: {}, props: {}, style: {}
    };
    for(const arg of this.arguments){
        const mod = this.target.context.elementMod(arg)
        if(mod) for(const x of ["style", "props", "style_static"]) {
           this.target[x].push(...mod[x])
        }
    }
    return out
}

export { and as also }

export function and(this: ModifyDelegate){
    const { target } = this;

    if(target instanceof ElementModifier) void 0;
    else throw new Error(`Default modifier "also" may only be used in other modifiers.`);
    
    let temp;
    const clone = Object.create(target);

    for(const alias of this.arguments)
        if(typeof alias == "string")
            if(temp = target.context.elementMod(alias))
                if(temp == target)
                    throw new Error("Bad argument, a component really shouldn't alias itself")
                else if(temp.inherits)
                    clone.inherits = temp.inherits,
                    temp.inherits = clone;
                else temp.inherits = clone;
            else target.context.parent.elementMod(alias, clone);
        else throw new Error("Bad argument,\"on\" modifiers expect identifiers or strings.")
}

export function priority(this: ModifyDelegate, z: number){
    this.target.stylePriority = z;
}
