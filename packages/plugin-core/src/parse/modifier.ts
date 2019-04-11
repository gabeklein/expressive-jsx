import t, { Expression, LabeledStatement } from '@babel/types';
import { AttributeBody, DelegateAbstraction, ExplicitStyle, MediaQueryModifier } from 'internal';
import Arguments from 'parse/abstractions';
import { BunchOf, ModifyAction, Path } from 'types';

export type ModTuple = [string, ModifyAction, DelegateAbstraction[]];

export function ApplyModifier(
    initial: string,
    recipient: AttributeBody, 
    input: Path<Expression>){

    const handler = recipient.context.propertyMod(initial);
    const inputs = input.isSequenceExpression()
        ? input.get("expressions") : [ input ];
    const args = inputs.map(Arguments.Parse);
    
    const totalOutput = { 
        props: {} as BunchOf<any>, 
        style: {} as BunchOf<any>
    };

    let i = 0;
    let mods = [] as ModTuple[];
    let current: ModTuple = [ 
        initial, handler, args
    ];

    do {
        const { output } = new ModifyDelegate(recipient, ...current);

        if(!output){
            i++; 
            continue; 
        }

        Object.assign(totalOutput.style, output.style);
        Object.assign(totalOutput.props, output.props);

        const next = output.attrs;
        const pending = [] as ModTuple[];

        if(next)
        for(const named in next){
            let input = next[named];
            let { context } = recipient;

            if(input == null) continue;

            if(named == initial){
                let found;
                do { 
                    found = context.hasOwnPropertyMod(named);
                    context = context.parent;
                }
                while(!found);
            }

            pending.push([
                named,
                context.propertyMod(named), 
                [].concat(input)
            ])
        }
        
        if(!pending.length)
            if(++i in mods)
                current = mods[i]
            else break;
        else {
            mods = pending.concat(mods.slice(i+1));
            current = mods[i = 0];
        }
    }
    while(true)

    for(const name in totalOutput.style){
        const item = totalOutput.style[name];
        recipient.insert(new ExplicitStyle(name, item))
    }
}

export class ModifyDelegate {
    arguments?: Array<any>
    priority?: number;
    done?: true;
    output = {} as BunchOf<any>;

    constructor(
        public target: AttributeBody,
        public name: string,
        transform: ModifyAction = PropertyModifierDefault,
        argument: DelegateAbstraction[]){

        const args = this.arguments = argument.map(x => {
            return x && typeof x == "object" && "value" in x ? x.value : x
        });

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
    
    declareMediaQuery(
        query: string, 
        body: Path<LabeledStatement>){

        new MediaQueryModifier(query, body, this.target.context).declare(this.target)
    }
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