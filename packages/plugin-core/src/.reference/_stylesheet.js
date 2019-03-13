import { LabeledStatement } from '@babel/types';
import { ElementInline, StackFrame } from 'internal';
import { BunchOf, Path } from 'types';
import { ElementModifier } from './';


interface ModifierOutput {
    attrs?: BunchOf<any>
    style?: BunchOf<any>
    props?: BunchOf<any>
    installed_style?: (ElementModifier | ElementInline)[]
}

export class WebstylesModifier extends ElementModifier {

}

export class ExternalSelectionModifier extends WebstylesModifier {
    inlineType = "none"
    transform?: () => void
    recipient?: ElementModifier | ElementInline;
    
    constructor(name: string, body: Path<LabeledStatement>, fn?: () => void){
        super(name, body);
        if(fn)
            this.transform = fn;
        this.stylePriority = 5
    }

    declare(recipient: ElementModifier | ElementInline){
        this.recipient = recipient;
        this.selectAgainst = recipient;
        recipient.mayReceiveExternalClasses = true;
        this.context.selectionContingent = this;
        this.process();
        if(this.hasStaticStyle)
            this.declareForStylesInclusion(recipient);
    }

    getSelectorForNestedModifier(target: ElementModifier){
        target.stylePriority = this.stylePriority;
        return this.selector + " " + target.uniqueClassname
    }

    get selector(): string{
        const parent = this.selectAgainst;
        const ucn = this.uniqueClassname;
        let parentName = parent instanceof ExternalSelectionModifier 
            ? parent.selector
            : parent!.uniqueClassname;

        return ucn == "::both"
            ? `${parentName}::before, ${parentName}::after`
            : `${parentName}${ucn}`;
    }

    get path(){
        return (this.selectAgainst as any).path.concat(`.${this.name}`)
    }

    didExitOwnScope(){
        // TODO return value on add non-static
        // if(this.props.length)
        //     throw new Error("Props cannot be defined for a pure CSS modifier!")
        // if(this.style.length)
        //     throw new Error("Dynamic styles cannot be defined for a pure CSS modifier!")

        this.uniqueClassname = this.name;

        this.context.pop();
    }

    includeModifier(this: ElementModifier, modifier: ElementModifier){
        // throw new Error("unexpected function called, this is an internal error")
        modifier.selectAgainst = this;
        modifier.stylePriority = 3

        this.declareForStylesInclusion(this.selectAgainst!, modifier);

        const mod = this.context.nearestStyleProvider;
        if(mod) mod.provides.push(modifier);
        else this.selectAgainst!.context.declare(modifier) 
        
    }

    declareForStylesInclusion(recipient: ElementModifier | ElementInline, modifier = this){
        const noRoot = super.declareForStylesInclusion(recipient, modifier);
        if(noRoot){
            recipient.context.modifierInsertions.push(modifier);
        }
        return false;
    }
}

export class MediaQueryModifier extends ExternalSelectionModifier {

    queryString: string;
    recipient?: ElementModifier | ElementInline;

    constructor(query: string, body: Path<LabeledStatement>){
        super("media", body);
        this.queryString = query;
        if(this.context.modifierQuery)
            this.inherits = this.context.modifierQuery;
        this.context.modifierQuery = this;
    }

    get selector(){
        return this.selectAgainst!.selector
    }

    get uniqueClassname(){
        return this.selectAgainst!.uniqueClassname;
    }

    set uniqueClassname(_){}

    declare(recipient: ElementModifier | ElementInline){
        this.recipient = recipient;
        this.selectAgainst = recipient;
        this.stylePriority = 5
        recipient.mayReceiveExternalClasses = true;
        this.process();
        if(this.hasStaticStyle)
            this.declareForStylesInclusion(recipient);
    }