import t, { Expression, IfStatement, Statement } from '@babel/types';
import { DoExpressive, Path } from 'types';

import { ElementInline } from 'internal';

export class ComponentIf {

    children = [] as ComponentConsequent[];

    constructor(
        protected path: Path<IfStatement>, 
        public parent: ElementInline){
        
        const children = this.children;

        let layer: Path<Statement> = path;

        do {
            children.push(
                new ComponentConsequent(
                    this,
                    layer.get("consequent") as Path<Statement>,
                    layer.get("test") as Path<Expression>
                )
            );
            
            layer = layer.get("alternate") as Path<Statement>

        } while(layer.type == "IfStatement");

        if(layer.node)
            children.push(
                new ComponentConsequent(this, layer)
            )

        path.replaceWithMultiple(this.children.map(
            option => option.replacement
        ))
    }
}


export class ComponentConsequent extends ElementInline {
    replacement: Statement;

    constructor(
        public logicalParent: ComponentIf, 
        public path: Path<Statement>, 
        public test?: Path<Expression>){

        super(logicalParent.parent.context)

        let content = path.node;
        if(content.type !== "BlockStatement"){
            this.replacement = content;
            this.parse(path)
            return;
        }

        const body = t.doExpression(content) as DoExpressive;

        body.meta = this;
        this.replacement = t.expressionStatement(body);
    }
}