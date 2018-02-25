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

    createElement(){
        const { createElement } = Shared;
        return t.callExpression(createElement, Array.from(arguments))
    },

    declare(type, id, value){
        return (
            t.variableDeclaration(type, [
                t.variableDeclarator(id, value)
            ])
        )
    }

}