const t = require("babel-types")

//basically a singleton
export const Shared = {
    set(data){
        Object.assign(this, data);
    }
}

export const env = process.env || {
    NODE_ENV: "production"
};

export const Opts = {}

export const transform = {

    IIFE(stats){
        return t.callExpression(
            t.arrowFunctionExpression([], 
                t.blockStatement(stats)
            ), []
        )
    },

    createFragment(elements, props){
        return this.createElement(
            Shared.stack.helpers.Fragment, 
            t.objectExpression(props || []),
            ...elements
        )
    },

    element(){
        return {
            inlineType: "child",
            transform: () => ({
                product: this.createElement(...arguments)
            })
        }
    },

    object(obj){
        const properties = [];
        for(const x in obj)
            properties.push(
                t.objectProperty(
                    t.identifier(x),
                    obj[x]
                )
            )
        return t.objectExpression(properties);
    },

    member(object, ...path){
        if(object == "this") object = t.thisExpression()
        for(let x of path){
            if(typeof x == "string"){
                if(/^[A-Za-z0-9$_]+$/.test(x)){
                    object = t.memberExpression(object, t.identifier(x));
                    continue;
                }
                else x = t.stringLiteral(x)
            }
            else if(typeof x == "number")
                x = t.numericLiteral(x);

            object = t.memberExpression(object, x, true)
        }
        return object
    },

    createElement(type, props, ...children){
        if(typeof type == "string") type = t.stringLiteral(type);
        if(!props) props = t.objectExpression([]);

        return t.callExpression(Shared.stack.helpers.createElement, [type, props, ...children])
    },

    declare(type, id, value){
        return (
            t.variableDeclaration(type, [
                t.variableDeclarator(id, value)
            ])
        )
    }

}