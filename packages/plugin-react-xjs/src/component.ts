import { DoExpression, ExpressionStatement, LabeledStatement, Expression } from '@babel/types';

import { Attribute, ErrorsPossible, ExplicitStyle, Props, StackFrame } from './internal';
import { BunchOf, ElementItem, Path } from './types';

const ERROR = ErrorsPossible({
    ExpressionUnknown: "Unhandled expressionary statement of type {1}",
})

export abstract class TraversableBody {

    sequence = [] as unknown[];
    context?: StackFrame;

    didEnter?(path?: Path): void;
    didExit?(path?: Path): void;

    didEnterOwnScope(
        path: Path<DoExpression> ){
        
        if(this.didEnter)
            this.didEnter(path);

        for(const item of path.get("body").get("body"))
            if(item.type in this) 
                (this as any)[item.type](item);
            else throw item.buildCodeFrameError(`Unhandled node ${item.type}`)
    }

    didExitOwnScope(
        path: Path<DoExpression>){
        
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

    props = {} as BunchOf<Props>;
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