import { Expression, LabeledStatement } from '@babel/types';
import { ApplyModifier, ElementModifier, ParseErrors, TraversableBody } from 'internal';
import { BunchOf, FlatValue, Path } from 'types';

const Error = ParseErrors({
    ExpressionUnknown: "Unhandled expressionary statement of type {1}",
    NodeUnknown: "Unhandled node of type {1}",
    BadInputModifier: "Modifier input of type {1} not supported here!"
})

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

export class ExplicitStyle extends Attribute {
    priority = 1;
}

export abstract class AttributeBody extends TraversableBody {

    props = {} as BunchOf<Prop>;
    style = {} as BunchOf<ExplicitStyle>;
    props_static = {} as BunchOf<Prop>;
    style_static = {} as BunchOf<ExplicitStyle>;

    Prop(
        name: string | false, 
        value: FlatValue | Expression | undefined, 
        path?: Path<Expression>){

        this.addAttribute(
            new Prop(name, value, path),
            this.props
        );
    }

    Style(
        name: string | false, 
        value: FlatValue | Expression | undefined, 
        path?: Path<Expression>){

        this.addAttribute(
            new ExplicitStyle(name, value, path),
            this.style
        );
    }

    private addAttribute(
        item: Attribute,
        accumulator: BunchOf<typeof item>){

        if(item.name){
            const existing = accumulator[item.name];
            if(existing) existing.overriden = true;
            accumulator[item.name] = item;
        }

        this.add(item);
    }

    LabeledStatement(path: Path<LabeledStatement>){
        const { name } = path.node.label;
        const body = path.get("body");
    
        if(body.isBlockStatement())
            new ElementModifier(name, body, this.context).declare(this);

        else if(body.isExpressionStatement())
            ApplyModifier(name, this, body.get("expression"));

        else
            throw Error.BadInputModifier(body, body.type)
    }

    ExpressionDefault(path: Path<Expression>){
        throw Error.ExpressionUnknown(path, path.type);
    }
}