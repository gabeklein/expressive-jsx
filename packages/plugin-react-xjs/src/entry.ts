import {
    Expression,
    BlockStatement,
    Statement,
    Path
} from "./types";

import {
    transform,
    ElementInline
} from "./internal";

import * as t from "@babel/types";

export function ensureArray(
    children: Expression, 
    getFirst: boolean = false ){

    const array = t.callExpression(
        t.memberExpression(
            t.arrayExpression([]),
            t.identifier("concat")
        ),
        [children]
    )
    return getFirst ? t.memberExpression(array, t.numericLiteral(0), true) : array;
}

export class ComponentEntry extends ElementInline {

    stats_excused = 0;

    add(obj: any){
        super.add(obj)
        if(!this.precedent && obj.inlineType == "stats")
            this.stats_excused++;     
    }

    init(path: Path<Expression>){
        this.context.styleRoot = this;
        this.context.scope 
            = this.scope 
            = (path.get("body") as Path<BlockStatement>).scope;
    }
    
    outputBodyDynamic(){
        let body: Statement[] | undefined;
        let output;
        const { style, props } = this;

        if(
            style.length || 
            this.inlineInformation.installed_style.length ||  
            this.mayReceiveExternalClasses || 
            this.style_static.length || 
            props.length
        ){
            ({ 
                product: output, 
                factory: body
            } = this.build()); 
        }
        else {
            ({ body, output } = this.collateChildren());
            output = this.bundle(output)
        }

        return (body || []).concat(
            t.returnStatement(
                output
            )
        )
    }

    bundle(output: any[]){
        return output.length > 1
            ? transform.createFragment(output)
            : output[0] || t.booleanLiteral(false)
    }
}