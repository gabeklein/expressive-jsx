import { ComponentModifier } from "./modifier"

export function is(){
    const out = { 
        attrs: {}, props: {}, style: {}
    };
    for(const arg of arguments){
        const { computed } = (arg || {});
        if(computed) 
            for(const x in computed)
                Object.assign(out[x], computed[x])
        else 
            out.attrs[arg] = [];
    }
    return out
}

export { and as also }

export function and(){
    const { target, name } = this;

    if(target instanceof ComponentModifier);
    else throw new Error(`Default modifier "on" may only be used in other modifiers.`);
    
    let temp;
    const clone = Object.create(target);

    for(const alias of arguments)
        if(typeof alias == "string")
            if(temp = target.context["__" + alias])
                if(temp == target)
                    throw new Error("Bad argument, a component really shouldn't alias itself")
                else if(temp.inherits)
                    clone.inherits = temp.inherits,
                    temp.inherits = clone;
                else temp.inherits = clone;
            else Object.getPrototypeOf(target.context)["__" + alias] = clone;
        else throw new Error("Bad argument,\"on\" modifiers expect identifiers or strings.")
}
