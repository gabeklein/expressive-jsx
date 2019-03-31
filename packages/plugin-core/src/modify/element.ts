import t, { Statement } from '@babel/types';
import { AttributeBody, StackFrame } from 'internal';
import { Path, ModifierOutput } from "types";
import { Syntax } from 'generate/element';

export class ElementModifier extends AttributeBody {

    name: string;
    inherits?: ElementModifier;

    constructor(
        name: string,
        body: Path<Statement>,
        context: StackFrame ){

        super(context);
        this.name = name;

        const content = body.isBlockStatement() ? body.get("body") : [body];

        for(const item of content)
            this.parse(item);
    }

    generate(): Syntax {
        return [
            t.booleanLiteral(true)
        ]
    }

    declare(target: AttributeBody){
        // debugger
    }

    into(accumulator: ModifierOutput){
        
    }
}