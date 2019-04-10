import t, { Expression } from '@babel/types';
import { ComponentConsequent, ComponentIf } from '@expressive/babel-plugin-core';
import { ElementReact, GenerateReact } from 'internal';
import { StackFrameExt } from 'types';

export class ElementSwitch {

    constructor(
        public source: ComponentIf,
        private context: StackFrameExt){
    };

    toExpression(){
        const { forks } = this.source;
        if(forks.length > 1)
            return forks.reduceRight(
                this.inlineReduction.bind(this), 
                t.booleanLiteral(false)
            );
        else {
            let { test, product } = this.extract(forks[0]);
            
            let check: Expression = test!;

            if(check.type == "LogicalExpression")
                check = check.right;
                
            if(check.type != "BooleanLiteral" 
            && check.type != "BinaryExpression")
                check = t.unaryExpression("!", t.unaryExpression("!", check))

            return t.logicalExpression("&&", check, product);
        }
    }

    inlineReduction(alternate: Expression, current: ComponentConsequent){
        const { test, product } = this.extract(current);
        return test 
            ? t.conditionalExpression(test, product, alternate)
            : product
    }

    extract(item: ComponentConsequent): { test?: Expression, product: Expression } {
        const { test } = item;

        const content = new ElementReact(item);

        const Generator = this.context.Generator as GenerateReact;

        const product = Generator.container(content)
        
        return {
            test: test && test.node,
            product
        };
    }
}