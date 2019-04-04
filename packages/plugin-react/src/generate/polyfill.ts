import template from '@babel/template';

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