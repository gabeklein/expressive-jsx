import t, { Expression } from '@babel/types';
import { ComponentIf, ComponentConsequent } from '@expressive/babel-plugin-core';
import { ElementReact, GenerateReact } from 'internal';
import { StackFrameExt } from 'types';

type GetProduct = (fork: ComponentConsequent) => Expression | undefined;

const opt = t.conditionalExpression;
const not = (a: Expression) => t.unaryExpression("!", a);
const and = (a: Expression, b: Expression) => t.logicalExpression("&&", a, b);

//TODO: figure out if falsey values interfere before allowing them through
// const anti = (a: Expression) => t.isUnaryExpression(a, { operator: "!" }) ? a.argument : not(a);
const anti = not; 

function reducerAlgorithm(
    forks: ComponentConsequent[], 
    predicate: GetProduct){

    forks = forks.slice().reverse();
    let sum: Expression | undefined;

    for(const cond of forks){
        const test = cond.test && cond.test.node;
        const product = predicate(cond);

        if(sum && test)
            sum = product
                ? opt(test, product, sum)
                : and(anti(test), sum)
        if(product)
            sum = test
                ? and(test, product)
                : product
    }

    return sum || t.booleanLiteral(false)
}

export class ElementSwitch {

    constructor(
        public source: ComponentIf,
        private context: StackFrameExt){
    };

    toExpression(): Expression {
        const Generator = this.context.Generator as GenerateReact;
        return reducerAlgorithm(
            this.source.forks, 
            (cond) => {
                let product;
                
                if(cond.children.length)
                    product = Generator.container(
                        new ElementReact(cond)
                    )
                else return;
    
                if(t.isBooleanLiteral(product, { value: false }))
                    product = undefined;
    
                return product
            }
        )
    }

    classLogic(): Expression {
        return reducerAlgorithm(
            this.source.forks,
            (cond) => {
                if(cond.usesClassname)
                    return t.stringLiteral(cond.usesClassname);
            }
        )
    }
}