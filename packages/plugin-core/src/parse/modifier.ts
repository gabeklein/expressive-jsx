import t, { BlockStatement, ExpressionStatement, IfStatement, LabeledStatement } from '@babel/types';
import { ContingentModifier } from 'handle/modifier';
import { AttributeBody, ElementInline, ExplicitStyle, Modifier } from 'internal';
import Arguments from 'parse/arguments';
import { BunchOf, ModifyAction, Path } from 'types';
import { ParseErrors } from 'shared';

const Error = ParseErrors({
    ContingentNotImplemented: "Cant integrate this contingent request. Only directly in an element block."
})

type ModiferBody = Path<ExpressionStatement | BlockStatement | LabeledStatement | IfStatement>;
export type ModTuple = [string, ModifyAction, any[] | undefined, ModiferBody? ];

export function ApplyModifier(
    initial: string,
    recipient: Modifier | ElementInline, 
    input: ModiferBody){

    const handler = recipient.context.propertyMod(initial);
    let args;
    
    if(input.isExpressionStatement())
        args = Arguments.Parse(input.get("expression"));
    
    const totalOutput = { 
        props: {} as BunchOf<any>, 
        style: {} as BunchOf<any>
    };

    let i = 0;
    let stack = [] as ModTuple[];
    let current: ModTuple = [ initial, handler, args, input ];

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
        
        if(pending.length){
            stack = [...pending, ...stack.slice(i+1)];
            current = stack[i = 0];
        }
        else if(++i in stack)
            current = stack[i]
        else break;
    }
    while(true)

    for(const name in totalOutput.style){
        let item = totalOutput.style[name];

        if(Array.isArray(item)){
            const [ callee, ...args ] = item;
            item = `${callee}(${args.join(" ")})`
        }

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
        args: any[] | undefined,
        private body?: ModiferBody){

        this.arguments = args;

        const output = transform.apply(this, args || [])

        if(!output || this.done) return

        this.assign(output);
    }

    assign(data: any){
        for(const field in data){
            let value = data[field];
            if(field in this.output)
                Object.assign(this.output[field], value)
            else this.output[field] = value
        }
    }

    setContingent(contingent: string, priority?: number){
        const body = this.body!;
        const mod = new ContingentModifier(
            this.target.context,
            this.target as any,
            contingent
        )
        mod.priority = priority || this.priority;
        mod.parse(body);
        const { target } = this;
        if(target instanceof ElementInline)
            target.modifiers.push(mod);
        else 
            throw Error.ContingentNotImplemented(body)
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