import { Statement } from '@babel/types';
import { AttributeBody, ElementInline, StackFrame, ParseErrors } from 'internal';
import { Path } from 'types';

const Error = ParseErrors({
    BadModifierName: "Modifier name cannot start with _ symbol!",
    DuplicateModifier: "Duplicate declaration of named modifier!"
})

export class ElementModifier extends AttributeBody {

    inherits?: ElementModifier;
    provides = [] as ElementModifier[];
    appliesTo = 0;
    className?: string;

    constructor(
        public name: string,
        body: Path<Statement>,
        context: StackFrame ){

        super(context);

        if(name[0] == "_")
            throw Error.BadModifierName(body)

        if(this.context.hasOwnProperty("_" + name))
            throw Error.DuplicateModifier(body);    

        const content = body.isBlockStatement() ? body.get("body") : [body];

        for(const item of content)
            this.parse(item);
    }

    declare<T extends AttributeBody>(target: T){
        target.ElementModifier(this);
        this.loc = this.context.append(this.name)
    }

    apply(element: ElementInline){
        element.modifiers.push(this);
        this.appliesTo++;
    }

    ElementModifier(mod: ElementModifier){
        this.provides.push(mod);
    }
}

export class MediaQueryModifier
    extends ElementModifier {
    constructor(
        query: string,
        body: Path<Statement>,
        context: StackFrame){

        context = Object.create(context);
        context.ModifierQuery = query;

        super("media", body, context);
    }   
}

