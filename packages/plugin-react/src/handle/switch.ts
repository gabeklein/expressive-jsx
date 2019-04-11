import t, { Expression } from '@babel/types';
import { ComponentIf } from '@expressive/babel-plugin-core';
import { ElementReact, GenerateReact } from 'internal';
import { StackFrameExt } from 'types';

const opt = t.conditionalExpression;
const not = (a: Expression) => t.unaryExpression("!", a);
const and = (a: Expression, b: Expression) => t.logicalExpression("&&", a, b);

//TODO: figure out if falsey values interfere before allowing them through
// const anti = (a: Expression) => t.isUnaryExpression(a, { operator: "!" }) ? a.argument : not(a);
const anti = not; 

function fork(
    test?: Expression, 
    product?: Expression, 
    rest?: Expression
): Expression | undefined {
    if(rest && test)
        return product
            ? opt(test, product, rest)
            : and(anti(test), rest)
    if(product)
        return test
            ? and(test, product)
            : product
}

export class ElementSwitch {

    constructor(
        public source: ComponentIf,
        private context: StackFrameExt){
    };

    toExpression(){
        const Generator = this.context.Generator as GenerateReact;
        const conditions = this.source.forks;
        let sum: Expression | undefined;
        let i = conditions.length;

        while(i > 0){
            let product;
            const cond = conditions[--i]
            const test = cond.test && cond.test.node;

            if(cond.children.length)
                product = Generator.container(
                    new ElementReact(cond)
                )

            if(t.isBooleanLiteral(product, { value: false }))
                product = undefined;

            sum = fork(test, product, sum)
        }

        return sum || t.booleanLiteral(false)
    }

    classLogic(){
        const conditions = this.source.forks;
        let sum: Expression | undefined;
        let i = conditions.length;

        while(i > 0){
            let select;
            const cond = conditions[--i];
            const test = cond.test && cond.test.node;
            
            if(cond.usesClassname)
                select = t.stringLiteral(cond.usesClassname);
            
            sum = fork(test, select, sum)
        }

        return sum || t.booleanLiteral(false)
    }
}