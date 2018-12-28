import { ArrowFunctionExpression } from '@babel/types';

import { applyNameImplications, ElementInline } from './internal';
import { DoExpressive, Path } from './types';

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

    didExitOwnScope(path?: Path<DoExpressive>){
        const collated = this.collateStep();
        debugger;
        void collated;
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