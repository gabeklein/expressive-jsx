import t, { Expression } from '@babel/types';
import { ComponentConsequent, ComponentIf } from '@expressive/babel-plugin-core';
import { createFragment } from 'syntax';
import { ElementJSX, ContentReact } from 'internal';

export class SwitchJSX 
    implements ContentReact {

    source: ComponentIf

    constructor(source: ComponentIf){
        this.source = source;
    };

    toElement(){
        const output = this.toExpression();
        if(t.isJSXElement(output))
            return output;
        else
            return t.jsxExpressionContainer(output);
    }

    toExpression(){
        const { children } = this.source;
        if(children.length > 1)
            return children.reduceRight(
                this.inlineReduction.bind(this), 
                t.booleanLiteral(false)
            );
        else {
            let { test, product } = this.extract(children[0]);
            
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

        const content = new ElementJSX(item);
        const { jsxChildren } = content;

        const product: any =
            jsxChildren.length == 1
                ? jsxChildren[0]
                : createFragment(jsxChildren)

        return {
            test: test && test.node,
            product
        };
    }
}