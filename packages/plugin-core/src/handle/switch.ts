import t, { Expression, IfStatement, Statement, ExpressionStatement } from '@babel/types';
import { ElementInline } from 'internal';
import { Path, DoExpressive } from 'types';

export class ComponentIf {

    children = [] as ComponentConsequent[];

    constructor(
        protected path: Path<IfStatement>, 
        public parent: ElementInline){
        
        const children = this.children;

        let layer: Path<Statement> = path;

        do {
            const consequent = 
                new ComponentConsequent(
                    this,
                    layer.get("consequent") as Path<Statement>,
                    layer.get("test") as Path<Expression>
                )

            children.push(consequent);
            
            layer = layer.get("alternate") as Path<Statement>

        } while(layer.type == "IfStatement");

        if(layer.node)
            children.push(
                new ComponentConsequent(this, layer)
            )

        const doInsert = [] as ExpressionStatement[];

        for(const {replacement} of children)
            if(replacement)
                doInsert.push(replacement);

        if(doInsert.length)
            path.replaceWith(
                t.blockStatement(doInsert)
            );
    }
}

export class ComponentConsequent extends ElementInline {
    replacement?: ExpressionStatement;

    constructor(
        public logicalParent: ComponentIf, 
        public path: Path<Statement>, 
        public test?: Path<Expression>){

        super(logicalParent.parent.context)

        let content = path.node;
        if(content.type !== "BlockStatement")
            this.parse(path)
        else {
            const body = t.doExpression(content) as DoExpressive;
            body.meta = this;
            this.replacement = t.expressionStatement(body);
        }
    }
}