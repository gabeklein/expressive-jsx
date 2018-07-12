import { ElementModifier } from "./modifier"

export function is(){
    const out = { 
        attrs: {}, props: {}, style: {}
    };
    for(const arg of this.arguments){
        const mod = this.target.context.elementMod(arg)
        if(mod) for(const x of ["style", "props", "style_static"]) {
           this.target[x].push(...mod[x])
        }
        // const { computed } = (arg || {});
        // if(computed) 
        //     for(const x in computed)
        //         Object.assign(out[x], computed[x])
        // else 
        //     out.attrs[arg] = [];
    }
    return out
}

export { and as also }

export function and(){
    const { target, name } = this;

    if(target instanceof ElementModifier);
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

export function priority(z){
    this.target.stylePriority = z;
}
