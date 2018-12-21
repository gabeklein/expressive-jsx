import {
    Path, DoExpressive
} from "./types";

import {
    ElementInline, applyNameImplications
} from "./internal"

import {
    DoExpression, ArrowFunctionExpression
} from "@babel/types"

export class ComponentExpression extends ElementInline {

    constructor(
        name: string,
        path: Path<DoExpressive>){

        super();

        this.primaryName = name;
        if(/^[A-Z]/.test(name))
            applyNameImplications(name, this);

        path.node.meta = this;
    }

    didExitOwnScope(path: Path<DoExpression>){
        debugger;
        super.didEnterOwnScope(path);
    }
}

export class ComponentArrowExpression extends ComponentExpression {
    constructor(
        name: string,
        path: Path<DoExpressive>,
        fn: Path<ArrowFunctionExpression>){
        
        super(name, path);
    }
}