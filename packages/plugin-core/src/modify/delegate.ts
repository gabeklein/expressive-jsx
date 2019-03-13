import t, { Expression, ExpressionStatement } from '@babel/types';
import { AttributeBody, GeneralModifier } from 'internal';
import { BunchOf, Path, ModifyAction } from 'types';
import Arguments from './parse';

export function ModifyProcess(
    mod: GeneralModifier,
    recipient: AttributeBody,
    body: Path<ExpressionStatement>){

    const expression = body.get("expression");

    const content = expression.isSequenceExpression()
        ? expression.get("expressions") : [ expression ];

    const { name, transform } = mod;

    const delegate = new ModifyDelegate(name, content, recipient, transform);

    return delegate.data;
}

export class ModifyDelegate {
    name: string;
    target: AttributeBody;
    done?: true;
    priority?: number;
    arguments?: Array<any>

    data = {} as BunchOf<any>;

    constructor(
        name: string,
        value: Path<Expression>[], 
        target: AttributeBody,
        transform: ModifyAction = propertyModifierDefault){

        this.name = name;
        this.target = target;

        const args = this.arguments = value.map(Arguments.Parse);

        const output
            = transform.length
            ? transform.apply(this, args)
            : transform.call(this)

        if(this.done) return

        if(output)
            this.assign(output);
    }

    public assign(data: any){
        for(const field in data)
            if(this.data[field])
                Object.assign(this.data[field], data[field])
            else this.data[field] = data[field]
    }

    // get arguments(): any[] {

    //     if(!this.body) throw new Error();

    //     const args = this.body ? [Arguments.Parse(this.body)] : [];

    //     const { context } = this.target;

    //     for(const argument of args)
    //         if(typeof argument == "object" && argument.callee){
    //             const { inner, callee, callee } = argument;
    //             const valueMod = context.valueMod(callee);

    //             if(valueMod) 
    //                 try {
    //                     const computed = valueMod(...inner)

    //                     if(computed.value) argument.computed = computed; 
    //                     if(computed.require) argument.requires = computed.require;

    //                 } catch(err) {
    //                     throw callee ? callee.buildCodeFrameError(err.message) : err;
    //                 } 
    //             else {
    //                 argument.computed = {value: `${ callee }(${ inner.join(" ") })`}
    //             }
    //         }

    //     return this.arguments = args;
    // }

    // set arguments(value) {
    //     Object.defineProperty(this, "arguments", { configurable: false, writable: false, value: value })
    // }

    // declareElementModifier(
    //     name: string, 
    //     body: Path<t.LabeledStatement>, 
    //     fn?: (() => void) | undefined ){

    //     const mod = new ExternalSelectionModifier(name, body, fn);
    //     if(this.priority) mod.stylePriority = this.priority;
    //     mod.declare(this.target);
    // }

    // declareMediaQuery(
    //     query: string, 
    //     body: Path<LabeledStatement>){

    //     new MediaQueryModifier(query, body).declare(this.target)
    // }
}

function propertyModifierDefault(
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