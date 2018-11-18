
import template from "@babel/template";

exports.fnCreateIterated = template(`
    function NAME(from, key){
        return from.length 
            ? CREATE.apply(null, [FRAG, key ? {key} : {}].concat(from))
            : false
    }
`)

exports.fnExtends = template(`
    function NAME(){
        for(var item of arguments){
            if(!item) throw new Error("Included properties object is undefined!")
        }
        return Object.assign.apply(null, [{}].concat(Array.from(arguments)));
    }
`)

exports.createApplied = template(`
    function NAME(from){
        return _create.apply(undefined, from);
    }
`)

exports.fnBindMethods = template(`
    function expressive_methods(instance, methods) {
        for(var name of methods){
            instance[name] = instance[name].bind(instance)
        }
    }
`)

exports.fnSelect = template(`
    function NAME() {
        var output = "";
        for(var classname of arguments)
            if(typeof classname == "string")
                output += " " + classname;
        return output.substring(1)
    }
`)