import { Statement } from '@babel/types';
import { AttributeBody, StackFrame } from 'internal';
import { Path, BunchOf } from 'types';
import { ElementInline } from './element';

function concat(
    to: any,
    from: any, 
    ...names: string[]){

    to = to as BunchOf<any[]>;
    from = from as BunchOf<any[]>;

    for(const name of names)
    if(name in from)
    if(name in to)
        to[name] = from[name].concat(to[name])
    else
        to[name] = from[name];
}

export abstract class Modifier extends AttributeBody {
    forSelector?: string[];
    onlyWithin?: Modifier;
    onGlobalStatus?: string[];
    priority?: number;

    parse(body: Path<Statement>){
        const content = body.isBlockStatement() ? body.get("body") : [body];
        for(const item of content)
            super.parse(item);
    }
}

export class ElementModifier
    extends Modifier {

    name?: string;
    next?: ElementModifier;
    nTargets = 0;
    provides = [] as ElementModifier[];
    
    constructor(
        context: StackFrame,
        name: string,
        body: Path<Statement>){

        super(context);
        this.name = name;
        this.context.resolve(name);
        this.forSelector = [ this.uid ];
        this.parse(body);
    }

    ElementModifier(mod: ElementModifier){
        this.provides.push(mod);
        this.onlyWithin = mod.onlyWithin;
        concat(mod, this, "onGlobalStatus")
    }
}

export class ContingentModifier 
    extends Modifier {

    anchor: ElementModifier | ElementInline;

    constructor(
        context: StackFrame,
        parent: ContingentModifier | ElementModifier | ElementInline,
        contingent?: string
    ){
        super(context);

        let select;

        if(parent instanceof ElementInline)
            select = [ `.${parent.uid}` ];
        else {
            select = Object.create(parent.forSelector!);
            if(parent instanceof ContingentModifier)
                parent = parent.anchor;
        }

        if(contingent)
            select.push(contingent);

        this.anchor = parent;
        this.forSelector = select;
    }

    ElementModifier(mod: ElementModifier){
        const { anchor } = this;

        mod.onlyWithin = this;

        if(anchor instanceof ElementModifier)
            anchor.provides.push(mod)
        else 
            anchor.context.elementMod(mod)
    }
}