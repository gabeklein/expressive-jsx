import t, { Expression, ExpressionStatement, IfStatement, LabeledStatement, Statement } from '@babel/types';
import { ElementInline, ElementModifier, InnerContent, StackFrame } from 'internal';
import { Path } from 'types';

export class ComponentIf {

    forks = [] as ComponentConsequent[];
    context: StackFrame;
    hasElementOutput?: true;
    hasStyleOutput?: true;

    constructor(
        protected path: Path<IfStatement>, 
        context: StackFrame){

        this.context = context.create(this);
        
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

    slaveModifier?: ElementModifier;
    usesClassname?: string;
    parentElement: ElementInline;
    index: number;

    constructor(
        public parent: ComponentIf, 
        public path: Path<Statement>, 
        public test?: Path<Expression>){

        super(parent.context);

        this.parentElement = parent.context.currentElement!
        this.index = parent.forks.length;

        this.doBlock = this.handleContentBody(path);
        if(!this.doBlock){
            this.didExitOwnScope();
            const child = this.children[0];
            if(child instanceof ElementInline)
                this.doBlock = child.doBlock
        }
    }

    adopt(child: InnerContent){
        this.parent.hasElementOutput = true;
        super.adopt(child)
    }

    didExitOwnScope(){
        const mod = this.slaveModifier!;
        const parent = this.parentElement;

        if(!mod) return;
            
        parent.modifiers.push(mod);
        mod.appliesTo = -1;

        for(const sub of mod.provides)
            parent.context.elementMod(sub)
    }

    LabeledStatement(path: Path<LabeledStatement>){
        const mod = this.slaveModifier || this.slaveNewModifier()
        super.LabeledStatement(path, mod);
    }

    private slaveNewModifier(){
        this.parent.hasStyleOutput = true;

        let { test } = this;
        const { context } = this.parent;
        const parent = this.parentElement;
        let selector = `op${this.index}`;

        if(test){
            let ref = "is";
            if(test.isUnaryExpression({ operator: "!" })){
                test = test.get("argument");
                ref = "not"
            }
            if(test.isIdentifier()){
                const { name } = test.node;
                selector = ref + name[0].toUpperCase() + name.slice(1);
            }
        }
        
        this.usesClassname = selector;

        const mod = new ElementModifier(context);
        mod.name = parent.name;
        mod.contingents = [`.${selector}`]
        mod.context.prefix = parent.context.prefix;

        return this.slaveModifier = mod;
    }
}