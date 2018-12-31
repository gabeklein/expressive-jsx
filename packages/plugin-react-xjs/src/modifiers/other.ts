import { LabeledStatement } from '@babel/types';
import { BunchOf, Path, ModTuple, ModifyAction } from '../internal/types';
import { ModifyProcess, ElementModifier } from '.';
import { AttributeBody, ExplicitStyle } from '../internal';

export function ApplyModifier(
    recipient: AttributeBody, 
    src: Path<LabeledStatement>){

    const name = src.node.label.name;
    const body = src.get("body");

    const modifier = 
        recipient.context.propertyMod(name) || 
        new GeneralModifier(name);
    
    const accumulated = { 
        props: {} as BunchOf<any>, 
        style: {} as BunchOf<any>
    };

    let i = 0;
    let mods = [] as ModTuple[];
    let current: ModTuple = [ modifier, body ];

    do {
        const [ mod, body ] = current;
        let delegateOutput;

        if(body.isBlockStatement())
            new ElementModifier(mod.name, body, recipient.context).declare(recipient);
        else 
        if(body.isExpressionStatement())
            delegateOutput = ModifyProcess(mod, recipient, body);
        else 
            throw body.buildCodeFrameError(`Delegate body of type ${body.type} not supported here!`) 

        if(!delegateOutput){
            i++; 
            continue; 
        }

        Object.assign(accumulated.style, delegateOutput.style);
        Object.assign(accumulated.props, delegateOutput.props);

        const next = delegateOutput.attrs;
        const pending = [] as ModTuple[];

        if(next)
        for(const named in next){
            let value = next[named];
            let { context } = recipient;

            if(value == null) continue;

            if(named == name){
                let found;
                do { 
                    found = context.hasOwnPropertyMod(named);
                    context = context.parent;
                }
                while(!found);
            }

            const handler = context.propertyMod(named) || new GeneralModifier(named);

            pending.push([
                handler, 
                value
            ])
        }
        
        if(!pending.length)
            if(mods[++i])
                current = mods[i]
            else break;
        else {
            mods = pending.concat(mods.slice(i+1));
            current = mods[i = 0];
        }
    }
    while(true)

    for(const name in accumulated.style){
        const item = accumulated.style[name];
        recipient.apply(new ExplicitStyle(name, item));
    }
}

export class GeneralModifier {
    name: string;
    transform?: ModifyAction;

    constructor(
        name: string, 
        transform?: ModifyAction ){

        this.name = name;
        if(transform)
            this.transform = transform;
    }
}