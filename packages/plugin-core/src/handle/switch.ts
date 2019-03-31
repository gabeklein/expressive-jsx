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

        for(const { doBlock: body } of children)
            if(body)
                doInsert.push(
                    t.expressionStatement(body)
                );

        if(doInsert.length)
            path.replaceWith(
                t.blockStatement(doInsert)
            );
    }
}

export class ComponentConsequent extends ElementInline {
    constructor(
        public parent: ComponentIf, 
        public path: Path<Statement>, 
        public test?: Path<Expression>){

        super(parent.parent.context);

        this.doBlock = this.handleContentBody(path)// || this.children[0].doBlock;
        if(!this.doBlock){
            const [ child ] = this.children;
            if(child instanceof ElementInline)
                this.doBlock = child.doBlock
        }
    }
}