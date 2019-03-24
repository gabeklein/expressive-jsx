import t, { Expression, ExpressionStatement, LabeledStatement, Statement } from '@babel/types';
import { ApplyModifier, PossibleExceptions, ExplicitStyle, Prop, StackFrame } from 'internal';
import { BunchOf, DoExpressive, Path, FlatValue } from 'types';
import { SpreadItem } from './item';
import { SequenceItem } from 'generate/element';

const Error = PossibleExceptions({
    ExpressionUnknown: "Unhandled expressionary statement of type {1}",
    NodeUnknown: "Unhandled node of type {1}"
})

export abstract class TraversableBody {

    sequence = [] as SequenceItem[];

    willEnter?(path?: Path): void;
    willExit?(path?: Path): void;

    constructor(
        public context: StackFrame){
    }

    handleContentBody(content: Path<Statement>){
        if(content.isBlockStatement()){
            const body = t.doExpression(content.node) as DoExpressive;
            body.meta = this as any;
            return body;
        }
        else this.parse(content)
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
    
    add(item: SequenceItem){
        this.sequence.push(item);
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

export abstract class AttributeBody extends TraversableBody {

    props = {} as BunchOf<Prop>;
    style = {} as BunchOf<ExplicitStyle>;

    // apply(item: Attribute){
    //     const { name } = item;
    //     const list = item instanceof ExplicitStyle
    //         ? this.style
    //         : this.props;

    //     const existing = list[name];
    //     if(existing) existing.overriden = true;
    //     list[name] = item;
    //     this.add(item);
    // } 

    Prop(
        name: string | null, 
        value: FlatValue | Expression | undefined, 
        path?: Path<Expression>){

        if(!name){
            this.add(
                new SpreadItem("props", value!, path)
            )
        }
        else {
            const { props } = this;
            const existing = props[name];
            if(existing) existing.overriden = true;
            const item = props[name] = new Prop(name, value, path);
            this.add(item);
        }
    }

    Style(
        name: string | null, 
        value: FlatValue | Expression, 
        path?: Path<Expression>){

        if(!name){
            this.add(
                new SpreadItem("props", value!, path)
            )
        }
        else {
            const { props } = this;
            const existing = props[name];
            if(existing) existing.overriden = true;
            const item = props[name] = new Prop(name, value, path);
            this.add(item);
        }
    }

    ExpressionDefault(path: Path<Expression>){
        throw path.buildCodeFrameError("nope")
    }

    LabeledStatement(path: Path<LabeledStatement>){
        ApplyModifier(this, path);
    }
}