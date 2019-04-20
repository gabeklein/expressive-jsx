import t, { Expression, ExpressionStatement, IfStatement, LabeledStatement, Statement } from '@babel/types';
import { ContingentModifier, ElementInline, InnerContent, StackFrame } from 'internal';
import { Path } from 'types';

type Consequent = ComponentIf | ComponentConsequent;

export class ComponentIf {

    forks = [] as Consequent[];
    context: StackFrame;
    hasElementOutput?: true;
    hasStyleOutput?: true;  

    constructor(
        protected path: Path<IfStatement>, 
        context: StackFrame, 
        public test?: Path<Expression>){

        context = this.context = context.create(this);
        context.currentIf = this;
        if(!test)
            context.entryIf = this;
        
        let layer: Path<Statement> = path;

        while(true){
            let consequent = layer.get("consequent") as Path<Statement>;
            const test = layer.get("test") as Path<Expression>

            if(consequent.isBlockStatement()){
                const inner = consequent.get("body");
                if(inner.length == 1)
                    consequent = inner[0]
            }

            const fork = consequent.isIfStatement()
                ? new ComponentIf(consequent, context, test)
                : new ComponentConsequent(
                    consequent, 
                    context, 
                    this.forks.length + 1,
                    test
                )

            const index = this.forks.push(fork);
            fork.context.resolveFor(index);

            if(fork instanceof ComponentConsequent)
                fork.index = index;
            
            layer = layer.get("alternate") as Path<Statement>

            if(layer.type !== "IfStatement"){
                if(layer.node){
                    this.forks.push(
                        new ComponentConsequent(layer, this.context, this.forks.length + 1)
                    )
                }
                break;
            }
        };
            
        const doInsert = [] as ExpressionStatement[]; 
        
        for(const fork of this.forks)
            if(fork instanceof ComponentConsequent 
            && fork.doBlock) 
                doInsert.push(
                    t.expressionStatement(fork.doBlock)
                )

        if(doInsert.length)
            path.replaceWith(
                t.blockStatement(doInsert)
            );
    }
}

export class ComponentConsequent extends ElementInline {

    slaveModifier?: ContingentModifier;
    usesClassname?: string;

    constructor(
        public path: Path<Statement>, 
        public context: StackFrame, 
        public index: number,
        public test?: Path<Expression>){

        super(context);

        this.doBlock = this.handleContentBody(path);
        if(!this.doBlock){
            this.didExitOwnScope();
            const child = this.children[0];
            if(child instanceof ElementInline)
                this.doBlock = child.doBlock
        }
    }

    get parentElement(){
        return this.context.currentElement;
    }

    adopt(child: InnerContent){
        let { context } = this;
        if(!context.currentIf!.hasElementOutput)
            do {
                if(context.current instanceof ComponentIf)
                    context.current.hasElementOutput = true;
                else break;
            }
            while(context = context.parent)
        super.adopt(child)
    }

    didExitOwnScope(){
        const mod = this.slaveModifier!;
        const parent = this.context.currentElement!;

        if(!mod) return;
            
        parent.modifiers.push(mod);
    }

    LabeledStatement(path: Path<LabeledStatement>){
        const mod = this.slaveModifier || this.slaveNewModifier()
        super.LabeledStatement(path, mod);
    }

    private slaveNewModifier(){
        let { context } = this;

        //TODO: Discover helpfulness of customized className.
        // let selector = specifyOption(this.test) || `opt${this.index}`;
        let selector = `opt${this.index}`;
        const parent = context.currentElement!;

        const mod = new ContingentModifier(
            context, parent, `.${selector}`
        );

        parent.modifiers.push(mod);

        if(!context.currentIf!.hasStyleOutput)
            do {
                if(context.current instanceof ComponentIf)
                    context.current.hasStyleOutput = true;
                else break;
            }
            while(context = context.parent)

        this.usesClassname = selector;
        return this.slaveModifier = mod;
    }
}

void function specifyOption(test?: Path<Expression>){
    if(!test)
        return "else"

    let ref = "";
    if(test.isUnaryExpression({ operator: "!" })){
        test = test.get("argument");
        ref = "-"
    }
    if(test.isIdentifier()){
        const { name } = test.node;
        return ref + name;
    }
}