import { Statement } from '@babel/types';
import { AttributeBody } from 'internal';
import { Path } from 'types';
import { StackFrame } from 'parse/program';
import { ElementInline } from 'handle/element';

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

        const content = body.isBlockStatement() ? body.get("body") : [body];

        for(const item of content)
            this.parse(item);
    }

    declare<T extends AttributeBody>(target: T){
        target.ElementModifier(this);
        this.loc = this.context.loc + " " + this.name;
    }

    apply(element: ElementInline){
        element.modifiers.push(this);
        this.appliesTo++;
    }

    ElementModifier(mod: ElementModifier){
        this.provides.push(mod);
    }
}