import { Expression, ExpressionStatement, LabeledStatement, Statement } from '@babel/types';
import { ApplyModifier, Attribute, Exceptions, ExplicitStyle, Prop, StackFrame } from 'internal';
import { BunchOf, DoExpressive, ElementItem, Path } from 'types';

const Error = Exceptions({
    ExpressionUnknown: "Unhandled expressionary statement of type {1}",
    NodeUnknown: "Unhandled node of type {1}"
})

export abstract class TraversableBody {

    sequence = [] as unknown[];

    willEnter?(path?: Path): void;
    willExit?(path?: Path): void;

    constructor(
        public context: StackFrame){
    }
    
    add(item: ElementItem){
        this.sequence.push(item);
    }

    didEnterOwnScope(
        path: Path<DoExpressive>){

        this.context = this.context.register(this);

        const body = path
            .get("body") //body element
            .get("body") //elements list

        for(const item of body)
            this.parse(item);
    }

    parse(item: Path<Statement>){
        if(item.type in this) 
            (this as any)[item.type](item);
        else throw Error.NodeUnknown(item, item.type)
    }

    didExitOwnScope(
        path: Path<DoExpressive>){

        this.context.pop();
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

export abstract class AttributeBody extends TraversableBody {

    props = {} as BunchOf<Prop>;
    style = {} as BunchOf<ExplicitStyle>;

    apply(item: Attribute){
        const { name } = item;
        const list = item instanceof ExplicitStyle
            ? this.style
            : this.props;

        const existing = list[name];
        if(existing) existing.overriden = true;
        list[name] = item;
        this.sequence.push(item);
    } 

    ExpressionDefault(path: Path<Expression>){
        throw path.buildCodeFrameError("nope")
    }

    LabeledStatement(path: Path<LabeledStatement>){
        ApplyModifier(this, path);
    }
}