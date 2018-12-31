import { Statement } from '@babel/types';
import { AttributeBody, StackFrame } from '../internal';
import { Path, ModifierOutput } from "internal/types";

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

    declare(target: AttributeBody){
        debugger
    }

    into(accumulator: ModifierOutput){

    }
}