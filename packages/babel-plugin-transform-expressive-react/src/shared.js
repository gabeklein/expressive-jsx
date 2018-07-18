const t = require("babel-types")

//basically a singleton
export const Shared = {
    set(data){
        Object.assign(this, data);
    }
}

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
        const { Fragment } = Shared;
        return this.createElement(
            Fragment, 
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

    createElement(type, props, ...children){
        if(typeof type == "string") type = t.stringLiteral(type);
        if(!props) props = t.objectExpression([]);

        return t.callExpression(Shared.createElement, [type, props, ...children])
    },

    declare(type, id, value){
        return (
            t.variableDeclaration(type, [
                t.variableDeclarator(id, value)
            ])
        )
    }

}