import { Expression, ExpressionStatement, LabeledStatement } from '@babel/types';
import { Attribute, ExplicitStyle, ParseErrors, StackFrame, Prop } from './internal';
import { BunchOf, DoExpressive, ElementItem, Path } from './types';

const ERROR = ParseErrors({
    ExpressionUnknown: "Unhandled expressionary statement of type {1}",
    NodeUnknown: "Unhandled node of type {1}"
})

export abstract class TraversableBody {

    sequence = [] as unknown[];
    context?: StackFrame;

    didEnter?(path?: Path): void;
    didExit?(path?: Path): void;

    didEnterOwnScope(
        path: Path<DoExpressive> ){
        
        if(this.didEnter)
            this.didEnter(path);

        for(const item of path.get("body").get("body"))
            if(item.type in this) 
                (this as any)[item.type](item);
            else throw ERROR.NodeUnknown(item, item.type)
    }

    didExitOwnScope(
        path: Path<DoExpressive>){
        
        if(this.didExit)
            this.didExit(path);
            
        this.context!.pop();
    }

    ExpressionStatement(this: BunchOf<Function>, path: Path<ExpressionStatement>){
        const expr = path.get("expression");
        if(expr.type in this) this[expr.type](expr);
        else if(this.ExpressionDefault) this.ExpressionDefault(expr);
        else throw ERROR.ExpressionUnknown(expr, expr.type);
    }
}

export abstract class AttributeRecipient extends TraversableBody {

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

    insert(item: ElementItem){
        this.sequence.push(item);
    }

    ExpressionDefault(path: Path<Expression>){
        path.buildCodeFrameError("nope")
    }

    LabeledStatement(path: Path<LabeledStatement>){
        return void 0;
    }
}