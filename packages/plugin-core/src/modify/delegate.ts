import t from '@babel/types';
import { AttributeBody } from 'internal';
import { BunchOf, ModifyAction } from 'types';

import { DelegateAbstraction } from './abstractions';

export class ModifyDelegate {
    syntax?: Array<DelegateAbstraction>
    arguments?: Array<any>
    priority?: number;
    done?: true;
    output = {} as BunchOf<any>;

    constructor(
        transform: ModifyAction = PropertyModifierDefault,
        argument: DelegateAbstraction[], 
        public name: string,
        public target: AttributeBody){

        this.syntax = argument;
        const args = this.arguments = argument.map(x => x && "value" in x ? x.value : x);

        const output = transform.apply(this, args)

        if(!output || this.done) return

        this.assign(output);
    }

    public assign(data: any){
        for(const field in data)
            if(field in this.output)
                Object.assign(this.output[field], data[field])
            else this.output[field] = data[field]
    }

    // declareElementModifier(
    //     name: string, 
    //     body: Path<t.LabeledStatement>, 
    //     fn?: (() => void) | undefined ){

    //     const mod = new ExternalSelectionModifier(name, body, fn);
    //     if(this.priority) mod.stylePriority = this.priority; 
    // }

    // declareMediaQuery(
    //     query: string, 
    //     body: Path<LabeledStatement>){

    //     new MediaQueryModifier(query, body).declare(this.target)
    // }
}

function PropertyModifierDefault(
    this: ModifyDelegate){

    const args = this.arguments!.map(arg => {

        const { value, requires } = arg;

        if(value) return value;

        else if(requires)
            return t.callExpression(
                t.identifier("require"), 
                [
                    typeof requires == "string"
                        ? t.stringLiteral(requires)
                        : requires
                ]
            )

        else return arg;
    })

    const output = 
        args.length == 1 || typeof args[0] == "object"
            ? args[0]
            : Array.from(args).join(" ")

    return {
        style: {
            [this.name]: output
        }
    }
}