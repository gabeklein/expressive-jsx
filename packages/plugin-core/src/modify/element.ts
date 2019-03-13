import t, { Statement } from '@babel/types';
import { AttributeBody, StackFrame } from 'internal';
import { Path, ModifierOutput } from "types";
import { Syntax } from 'generate/element';

export class ElementModifier extends AttributeBody {

    name: string;

    constructor(
        name: string,
        body: Path<Statement>,
        context: StackFrame ){

        super(context);
        this.name = name;

        this.parse(
            body.isBlockStatement() ? 
            body.get("body") : [body]
        );
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