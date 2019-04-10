import { Expression, LabeledStatement } from '@babel/types';
import { ApplyModifier, ElementModifier, ParseErrors, TraversableBody } from 'internal';
import { BunchOf, FlatValue, Path } from 'types';

const Error = ParseErrors({
    ExpressionUnknown: "Unhandled expressionary statement of type {1}",
    NodeUnknown: "Unhandled node of type {1}",
    BadInputModifier: "Modifier input of type {1} not supported here!",
    BadModifierName: "Modifier name cannot start with _ symbol!",
    DuplicateModifier: "Duplicate declaration of named modifier!"
})

export abstract class AttributeBody extends TraversableBody {
    
    props = {} as BunchOf<Prop>;
    style = {} as BunchOf<ExplicitStyle>;
    
    insert(item: Prop | ExplicitStyle){
        const { name } = item;
        const accumulator = item instanceof Prop
            ? this.props : this.style;

        if(name){
            const existing = accumulator[name];
            if(existing) existing.overriden = true;
            accumulator[name] = item;
        }

        this.add(item);
    }

    abstract ElementModifier(
        mod: ElementModifier
    ): void;

    LabeledStatement(path: Path<LabeledStatement>){
        const { name } = path.node.label;
        const body = path.get("body");
    
        if(body.isBlockStatement()){
            if(name[0] == "_")
                throw Error.BadModifierName(body)

            if(this.context.hasOwnProperty("_" + name))
                throw Error.DuplicateModifier(body);

            new ElementModifier(name, body, this.context).declare(this);
        }

        else if(body.isExpressionStatement())
            ApplyModifier(name, this, body.get("expression"));

        else
            throw Error.BadInputModifier(body, body.type)
    }

    ExpressionDefault(path: Path<Expression>){
        throw Error.ExpressionUnknown(path, path.type);
    }
}

export abstract class Attribute<T extends Expression = Expression> {
    name?: string;
    overriden?: boolean;
    invariant?: boolean;
    value: FlatValue | T | undefined
    path?: Path<T>

    constructor(
        name: string | false,
        value: FlatValue | T | undefined, 
        path?: Path<T>){

        if(name) this.name = name;
        if(value) this.value = value;
        if(path) this.path = path;

        if(value === null || typeof value !== "object")
            this.invariant = true
    }
};

export class Prop extends Attribute {}
export class ExplicitStyle extends Attribute {}