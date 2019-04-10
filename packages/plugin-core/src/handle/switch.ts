import t, { Expression, ExpressionStatement, IfStatement, Statement } from '@babel/types';
import { ElementInline } from 'internal';
import { Path } from 'types';

export class ComponentIf {

    forks: ComponentConsequent[];

    constructor(
        protected path: Path<IfStatement>, 
        public parent: ElementInline){
        
        const forks = this.forks = [] as ComponentConsequent[];

        let layer: Path<Statement> = path;

        do {
            const consequent = 
                new ComponentConsequent(
                    this,
                    layer.get("consequent") as Path<Statement>,
                    layer.get("test") as Path<Expression>
                )

            forks.push(consequent);
            
            layer = layer.get("alternate") as Path<Statement>

        } while(layer.type == "IfStatement");

        if(layer.node)
            forks.push(
                new ComponentConsequent(this, layer)
            )

        const doInsert = [] as ExpressionStatement[]; 
        
        for(const { doBlock } of forks)
            if(doBlock) doInsert.push(
                t.expressionStatement(doBlock)
            )

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

        this.doBlock = this.handleContentBody(path);
        if(!this.doBlock){
            const [ child ] = this.children;
            if(child instanceof ElementInline)
                this.doBlock = child.doBlock
        }
    }
}