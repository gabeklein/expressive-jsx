import t, { ExpressionStatement, Statement } from '@babel/types';
import { ComponentIf, ParseErrors, SequenceItem, StackFrame } from 'internal';
import { BunchOf, DoExpressive, Path } from 'types';

const Error = ParseErrors({
    ExpressionUnknown: "Unhandled expressionary statement of type {1}",
    NodeUnknown: "Unhandled node of type {1}",
    BadInputModifier: "Modifier input of type {1} not supported here!"
})

export abstract class TraversableBody {

    loc: string = "";
    name?: string;
    parent?: TraversableBody | ComponentIf;
    sequence = [] as SequenceItem[];

    willEnter?(path?: Path): void;
    willExit?(path?: Path): void;
    wasAddedTo?<T extends TraversableBody>(element?: T): void;

    constructor(
        public context: StackFrame){
    }

    didEnterOwnScope(path: Path<DoExpressive>){
        this.context = this.context.register(this);

        const body = path
            .get("body") //body element
            .get("body") //elements list

        for(const item of body)
            this.parse(item);
    }

    didExitOwnScope(path: Path<DoExpressive>){
        this.context.pop(); 
    }

    handleContentBody(content: Path<Statement>){
        if(content.isBlockStatement()){
            const body = t.doExpression(content.node) as DoExpressive;
            body.meta = this as any;
            return body;
        }
        else {
            this.parse(content);
            const last = this.sequence[this.sequence.length - 1];
            if(last instanceof TraversableBody)
                last.parent = this;
        }
    }
    
    add(item: SequenceItem){
        this.sequence.push(item);
        if("wasAddedTo" in item
        && item.wasAddedTo)
            item.wasAddedTo(this);
    }

    parse(item: Path<Statement>){
        if(item.type in this) 
            (this as any)[item.type](item);
        else throw Error.NodeUnknown(item, item.type)
    }

    ExpressionStatement(
        this: BunchOf<Function>, 
        path: Path<ExpressionStatement>){

        const expr = path.get("expression");
        if(expr.type in this) this[expr.type](expr);
        else if(this.ExpressionDefault) this.ExpressionDefault(expr);
        else throw Error.ExpressionUnknown(expr, expr.type);
    }
}