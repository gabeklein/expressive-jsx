import { Expression } from '@babel/types';
import { AttributeBody, ModifyDelegate } from 'internal';
import { BunchOf, ModifyAction, Path } from 'types';

import Arguments, { DelegateAbstraction } from 'parse/abstractions';

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
        const [ name, handler, input ] = current;
        
        const { output } = new ModifyDelegate(handler, input, name, recipient);

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
        recipient.Style(name, item)
    }
}