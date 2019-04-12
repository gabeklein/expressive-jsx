import { Statement } from '@babel/types';
import { AttributeBody, ElementInline, StackFrame } from 'internal';
import { Path } from 'types';

export class ElementModifier extends AttributeBody {

    inherits?: ElementModifier;
    provides = [] as ElementModifier[];
    appliesTo = 0;
    className?: string;

    constructor(
        context: StackFrame,
        public name?: string,
        body?: Path<Statement>){

        super(context);

        if(body){
        const content = body.isBlockStatement() ? body.get("body") : [body];
        for(const item of content)
            this.parse(item);
    }
    }

    declare<T extends AttributeBody>(target: T){
        target.ElementModifier(this);
        this.context.append(this.name)
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

        super(context, "media", body);
    }   
}

