import {
    booleanLiteral,
    conditionalExpression,
    Expression,
    isBooleanLiteral,
    logicalExpression,
    stringLiteral,
    unaryExpression,
} from '@babel/types';
import { ComponentConsequent, ComponentIf } from '@expressive/babel-plugin-core';
import { ElementReact, GenerateReact } from 'internal';

type Consequent = ComponentIf | ComponentConsequent;
type GetProduct = (fork: Consequent) => Expression | undefined;

const opt = conditionalExpression;
const not = (a: Expression) => unaryExpression("!", a);
const and = (a: Expression, b: Expression) => logicalExpression("&&", a, b);

//TODO: figure out if falsey values interfere before allowing them through
// const anti = (a: Expression) => isUnaryExpression(a, { operator: "!" }) ? a.argument : not(a);
const anti = not; 

function reducerAlgorithm(
    forks: Consequent[], 
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
        else if(product)
            sum = test
                ? and(test, product)
                : product
    }

    return sum || booleanLiteral(false)
}

export class ElementSwitch {

    constructor(
        public source: ComponentIf){
    };

    toExpression(Generator: GenerateReact): Expression {
        return reducerAlgorithm(
            this.source.forks, 
            (cond) => {
                let product;

                if(cond instanceof ComponentIf)
                    product = new ElementSwitch(cond).toExpression(Generator)
                else 
                if(cond.children.length)
                    product = Generator.container(
                        new ElementReact(cond)
                    )
                else 
                    return;
    
                if(isBooleanLiteral(product, { value: false }))
                    product = undefined;
    
                return product
            }
        )
    }

    classLogic(): Expression {
        return reducerAlgorithm(
            this.source.forks,
            (cond) => {
                if("usesClassname" in cond){
                    if(cond.usesClassname)
                        return stringLiteral(cond.usesClassname);
                }
                else if("hasStyleOutput" in cond){
                    if(cond.hasStyleOutput)
                        return new ElementSwitch(cond).classLogic()
                }
            }
        )
    }
}