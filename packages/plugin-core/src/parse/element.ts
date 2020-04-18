import { NodePath as Path } from '@babel/traverse';
import {
    BinaryExpression,
    Expression,
    FunctionExpression,
    isBinaryExpression,
    isExpression,
    isIdentifier,
    isLogicalExpression,
    isObjectMethod,
    isObjectProperty,
    isSequenceExpression,
    isSpreadElement,
    isStringLiteral,
    isTemplateLiteral,
    isUnaryExpression,
    LogicalExpression,
    SpreadElement,
    stringLiteral,
} from '@babel/types';
import { ElementInline, ElementModifier, ExplicitStyle, Prop } from 'handle';
import { inParenthesis, Opts, ParseErrors, Shared } from 'shared';
import { DoExpressive } from 'types';

type ListElement = Expression | SpreadElement;

const containsLineBreak = /\n/;

const Error = ParseErrors({
    NoParenChildren: "Children in Parenthesis are not allowed, for direct insertion used an Array literal",
    SemicolonRequired: "Due to how parser works, a semicolon is required after the element preceeding escaped children.",
    DoExists: "Do Expression was already declared!",
    PropUnknown: "There is no property inferred from an {1}",
    AssignOnlyIdent: "Prop assignment only works on an identifier to denote name",
    PropNameMember: "Member Expressions can't be prop names",
    BadProp: "Bad Prop! + only works in conjuction with an Identifier, got {1}",
    BadOperator: "Props may only be assigned with `=` or using tagged templates.",
    BadUnary: "{1} is not a recognized operator for props",
    BadExpression: "Expression must start with an identifier",
    BadPrefix: "Improper element prefix",
    BadObjectKeyValue: "Object based props must have a value. Got {1}",
    PropNotIdentifier: "Prop name must be an Identifier",
    NotImplemented: "{1} Not Implemented",
    VoidArgsOverzealous: "Pass-Thru (void) elements can only receive styles through `do { }` statement.",
    BadShorthandProp: "\"+\" shorthand prop must be an identifier!",
    NestOperatorInEffect: "",
    UnrecognizedBinary: ""
})

export function AddElementsFromExpression(
    subject: Expression, 
    parent: ElementInline ){

    var baseAttributes = [] as Expression[];

    if(isSequenceExpression(subject)){
        const exps = subject.expressions;
        [subject, ...baseAttributes] = exps;
    }

    const Handler = IsJustAValue(subject) 
        ? ApplyPassthru 
        : CollateLayers;

    return Handler(subject, parent, baseAttributes);
}

function IsJustAValue(subject: Expression){
    let leftOf: BinaryExpression | LogicalExpression | undefined;
    let target = subject;
    while(isBinaryExpression(target) || 
          isLogicalExpression(target)){
            leftOf = target;
            target = target.left;
          }

    if(isUnaryExpression(target, {operator: "void"})){
        if(leftOf)
            leftOf.left = target.argument;
        else 
            Object.assign(target, target.argument);
        return true
    }

    if(isStringLiteral(target))
        return true

    return false;
}

function ApplyPassthru(
    subject: Expression,
    parent: ElementInline,
    baseAttributes: Expression[]
){
    const identifierName = isIdentifier(subject) && subject.name;

    if(baseAttributes.length == 0
    && identifierName
    && !parent.context.elementMod("$" + identifierName)){
        parent.adopt(subject);
        return subject
    }

    if(baseAttributes.length > 1
    && baseAttributes[0].type !== "DoExpression")
        throw Error.VoidArgsOverzealous(subject)

    const container = new ElementInline(
        parent.context
    )
    ApplyNameImplications(
        isStringLiteral(subject) ? "string" : "void",
        container
    );
    if(identifierName){
        ApplyNameImplications(
            "$" + identifierName, 
            container
        );
        container.name = identifierName;
    }
    container.explicitTagName = "div";
    container.adopt(subject);
    container.parent = parent;
    parent.adopt(container);

    ParseProps(baseAttributes, container);
    return container;
}

function CollateLayers(
    subject: Expression,
    parent: ElementInline,
    baseAttributes: Expression[],
    inSequence?: true
){
    const chain = [] as Expression[];
    let restAreChildren: true | undefined;
    let nestedExpression: Expression | undefined;
    let leftMost: ElementInline | undefined;

    if(isBinaryExpression(subject, {operator: ">"})){
        const { left, right } = subject;
        (<any>right).doNotTransform = true;
        nestedExpression = right;
        subject = left;
    }

    while(isBinaryExpression(subject)){
        const { operator } = subject;
        const rightHand = subject.right;
        const leftHand = subject.left;

        if(operator == ">>>"){
            if(inSequence)
                throw Error.NestOperatorInEffect(subject);

            restAreChildren = true
        }
        else 
        if(operator !== ">>")
            throw Error.UnrecognizedBinary(subject);
        else
        if(inParenthesis(rightHand))
            throw Error.NoParenChildren(rightHand);

        chain.unshift(rightHand);
        subject = leftHand
    }
    chain.unshift(subject);

    for(const segment of chain){
        const child = new ElementInline(parent.context);

        ParseIdentity(segment, child);

        if(!leftMost)
            leftMost = child;
        
        parent.adopt(child);
        child.parent = parent;
        parent = child;
    }   

    if(restAreChildren){
        for(const child of baseAttributes)
            CollateLayers(child, leftMost!, [], true);
        baseAttributes = nestedExpression ? [nestedExpression] : []
    }
    else if(nestedExpression)
        baseAttributes.unshift(nestedExpression);

    ParseProps(baseAttributes, parent);
    return parent;
}

export function ApplyNameImplications(
    name: string, 
    target: ElementInline, 
    head?: true, 
    prefix?: string){
        
    const { context } = target;
    let modify: ElementModifier | undefined =
        context.elementMod(name);

    if(head){
        let explicit;
        if(prefix == "html" || /^[A-Z]/.test(name))
            explicit = target.explicitTagName = name
        
        if(!explicit || !target.name)
            target.name = name;
    }
    else 
        target.name = name;
    
    while(modify){
        target.modifiers.push(modify);
        modify.nTargets += 1

        // for(const mod of parent.modifiers)
        // if(mod instanceof ElementModifier)
        for(const sub of modify.provides)
            target.context.elementMod(sub)
        
        if(modify === modify.next){
            if(~process.execArgv.join().indexOf("inspect-brk"))
                console.error(`Still haven't fixed inheritance leak apparently. \n target: ${name}`)
            break
        }
        modify = modify.next;
    }
}

function ParseIdentity(
    tag: Expression,
    target: ElementInline ){

    let prefix: string | undefined;
    
    if(isBinaryExpression(tag, {operator: "-"})){
        const left = tag.left;

        if(isIdentifier(left))
            prefix = left.name;
        else
            throw Error.BadPrefix(left);
        tag = tag.right as any;
    }

    if(isUnaryExpression(tag, {operator: "!"})){
        prefix = "html"
        tag = tag.argument;
    }

    tag = unwrapExpression(tag, target);

    if(isIdentifier(tag))
        ApplyNameImplications(tag.name, target, true, prefix)

    else if(isStringLiteral(tag) || isTemplateLiteral(tag)){
        ApplyNameImplications("string", target);
        ApplyNameImplications(Opts.env == "native" ? Shared.stack.helpers.Text : "span", target, true)

        target.add(tag)
        // preventDefaultPolyfill(tag);
    }

    else throw Error.BadExpression(tag);
}

function unwrapExpression(
    expression: Expression,
    target: ElementInline ): Expression {

    while(!inParenthesis(expression)) 
        switch(expression.type){

        case "TaggedTemplateExpression": {
            let content: Expression = expression.quasi;

            if(content.expressions.length === 0 &&
               containsLineBreak.test(content.quasis[0].value.cooked!) === false){
                const text = content.quasis[0].value.cooked!;
                content = stringLiteral(text);
            }

            target.add(content)

            expression = expression.tag;
            // preventDefaultPolyfill(exp);
            break;
        }

        case "CallExpression": {
            const exp = expression;
            const args = exp.arguments;
            ParseProps( 
                args as ListElement[],
                target
            );
            expression = exp.callee as any;
            break;
        }

        case "MemberExpression": {
            const selector = expression.property as Path;
            if(expression.computed !== true && isIdentifier(selector))
                ApplyNameImplications(selector.name, target);
            else 
                throw Error.SemicolonRequired(selector)

            return expression.object;
            break;
        }

        default: 
            return expression;
    }

    return expression;
}

function ParseProps(
    props: ListElement[],
    target: ElementInline ){

    if(!props) return;
    for(let node of props){

        if((<any>node).doNotTransform 
        || IsJustAValue(node as Expression)){
            target.add(node as Expression)
            continue;
        }

        switch(node.type){
            case "DoExpression":
                (<DoExpressive>node).meta = target;
                target.doBlock = node as DoExpressive;
            break;

            case "TemplateLiteral":
            case "ArrowFunctionExpression": 
                target.add(node)
            break;

            case "ArrayExpression": {
                for(const item of node.elements)
                    if(isExpression(item))
                        target.add(item);
            }
            break;

            case "TaggedTemplateExpression": {
                const {tag, quasi} = node;
    
                if(tag.type != "Identifier") 
                    throw Error.PropNotIdentifier(node)
    
                target.add(
                    new Prop(
                        tag.name,
                        quasi.expressions.length == 0
                        ? stringLiteral(quasi.quasis[0].value.raw)
                        : quasi
                    )
                )
                
                // preventDefaultPolyfill(node);
            } break;

            case "AssignmentExpression": {
                const name = node.left;
                const value = node.right;

                if(!isIdentifier(name))
                    throw Error.AssignOnlyIdent(name);

                target.add(new Prop(name.name, value));
            } break;

            case "Identifier": {
                target.add(
                    new Prop(node.name, node)
                );
            } break;

            case "SpreadElement": 
                target.add(
                    new Prop(false, node.argument)
                );
            break;

            case "ObjectExpression": {
                for(const property of node.properties){
                    let insert: Prop;
                    
                    if(isObjectProperty(property)){
                        const { key, value } = property;
                        const name: string = key.value || key.name;

                        if(!isExpression(value))
                            throw Error.BadObjectKeyValue(value, value.type);

                        insert = new Prop(name, value)
                    }
                    
                    else if(isSpreadElement(property)){
                        insert = new Prop(false, property.argument);
                        // preventDefaultPolyfill(property);
                    } 
                    
                    else if(isObjectMethod(property)){
                        const func = Object.assign(
                            { id: null, type: "FunctionExpression" }, 
                            property as any
                        );
                        insert = new Prop(property.key, func as FunctionExpression)
                    }

                    target.add(insert!)
                }
            } break;

            case "UnaryExpression": {
                const value = node.argument
                switch(node.operator){
                    case "+": 
                        if(isIdentifier(value))
                            target.add(
                                new Prop(value.name, value)
                            );
                        else 
                            throw Error.BadShorthandProp(node);
                    break;

                    case "-":
                        target.add(
                            new Prop("className", value)
                        );
                    break;

                    case "~": 
                        target.add(
                            new ExplicitStyle(false, value)
                        );
                    break
                }
            } break;

            default: {
                throw Error.PropUnknown(node, node.type);
            }
        }
    }
}