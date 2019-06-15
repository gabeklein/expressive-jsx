import { NodePath as Path } from '@babel/traverse';
import {
    BlockStatement,
    callExpression,
    ExpressionStatement,
    identifier,
    IfStatement,
    LabeledStatement,
    Statement,
    stringLiteral,
} from '@babel/types';
import { AttributeBody, ElementInline, ExplicitStyle, Modifier, ContingentModifier } from 'handle';
import { ParseErrors } from 'shared';
import { BunchOf, ModifyAction, ModiferBody } from 'types';
import { Arguments } from 'parse';

type ModTuple = [string, ModifyAction, any[] | undefined, ModiferBody? ];

const Error = ParseErrors({
    ContingentNotImplemented: "Cant integrate this contingent request. Only directly in an element block."
})

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
    let stack = [
        [ initial, handler, args, input ] as ModTuple
    ];

    do {
        const { output } = new ModifyDelegate(recipient, ...stack[i]);

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
            i = 0;
        }
        else i++
    }
    while(i in stack)

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

    setContingent(
        contingent: string, 
        priority?: number, 
        usingBody?: Path<Statement>){

        const { target } = this;
        const mod = new ContingentModifier(
            this.target.context,
            this.target as any,
            contingent
        )
        
        mod.priority = priority || this.priority;
        mod.parse(usingBody || this.body!);
        if(target instanceof ElementInline)
            target.modifiers.push(mod);
        else if(
            target instanceof ContingentModifier &&
            target.anchor instanceof ElementInline){
            target.anchor.modifiers.push(mod);
        }
        else 
            throw Error.ContingentNotImplemented(body)

        return mod;
    }
}

function PropertyModifierDefault(
    this: ModifyDelegate){

    const args = this.arguments!.map(arg => {

        const { value, requires } = arg;

        if(value) return value;

        else if(requires)
            return callExpression(
                identifier("require"), 
                [
                    typeof requires == "string"
                        ? stringLiteral(requires)
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