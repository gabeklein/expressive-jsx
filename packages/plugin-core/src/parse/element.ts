import { NodePath as Path } from '@babel/traverse';
import {
    ArrayExpression,
    AssignmentExpression,
    CallExpression,
    Expression,
    FunctionExpression,
    Identifier,
    MemberExpression,
    ObjectExpression,
    SpreadElement,
    stringLiteral,
    TaggedTemplateExpression,
    UnaryExpression,
} from '@babel/types';
import { ElementInline, ElementModifier, ExplicitStyle, Prop } from 'handle';
import { inParenthesis, Opts, ParseErrors, preventDefaultPolyfill, Shared } from 'shared';
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
    subject: Path<Expression>, 
    current: ElementInline ){

    var baseAttributes = [] as Path<Expression>[];

    if(subject.isSequenceExpression()){
        const exps = subject.get('expressions');
        [subject, ...baseAttributes] = exps;
    }

    const Handler = IsJustAValue(subject) 
        ? ApplyPassthru 
        : CollateLayers;

    Handler(subject, current, baseAttributes);
}

function IsJustAValue(subject: Path<Expression>){
    let target = subject;
    while(target.isBinaryExpression() || 
          target.isLogicalExpression())
        target = target.get("left");

    if(target.isUnaryExpression({operator: "void"})){
        target.replaceWith(target.get("argument"))
        return true
    }

    if(target.isStringLiteral())
        return true

    return false;
}

function ApplyPassthru(
    subject: Path<Expression>,
    parent: ElementInline,
    baseAttributes: Path<Expression>[]
){
    const identifierName = subject.isIdentifier() && subject.node.name;

    if(baseAttributes.length == 0
    && !parent.context.elementMod("$" + identifierName)){
        parent.adopt(subject);
        return
    }

    if(baseAttributes.length > 1
    && baseAttributes[0].type !== "DoExpression")
        throw Error.VoidArgsOverzealous(subject)

    const container = new ElementInline(
        parent.context
    )
    ApplyNameImplications(
        subject.type == "StringLiteral" ? "string" : "void",
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
}

function CollateLayers(
    subject: Path<Expression>,
    parent: ElementInline,
    baseAttributes: Path<Expression>[],
    inSequence?: true
){
    const chain = [] as Path<Expression>[];
    let restAreChildren: true | undefined;
    let nestedExpression: Path<Expression> | undefined;
    let leftMost: ElementInline | undefined;

    if(subject.isBinaryExpression({operator: ">"})){
        const item = Object.create(subject.get("right"));
        item.type = "ExpressionLiteral";
        nestedExpression = item;
        subject = subject.get("left");
    }

    while(subject.isBinaryExpression()){
        const { operator } = subject.node;
        const rightHand = subject.get("right");
        const leftHand = subject.get("left");

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
        for(const mod of parent.modifiers)
        if(mod instanceof ElementModifier)
        for(const sub of mod.provides)
            parent.context.elementMod(sub)

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
        if(modify === modify.next){
            if(~process.execArgv.join().indexOf("inspect-brk"))
                console.error(`Still haven't fixed inheritance leak apparently. \n target: ${name}`)
            break
        }
        modify = modify.next;
    }
}

function ParseIdentity(
    tag: Path<Expression>,
    target: ElementInline ){

    let prefix: string | undefined;
    
    if(tag.isBinaryExpression({operator: "-"})){
        const left = tag.get("left") as Path<Expression>;

        if(left.isIdentifier())
            prefix = left.node.name;
        else
            throw Error.BadPrefix(left);
        tag = tag.get("right") as any;
    }

    if(tag.isUnaryExpression({operator: "!"})){
        prefix = "html"
        tag = tag.get("argument");
    }

    tag = UnwrapExpression(tag, target);

    if(tag.isIdentifier())
        ApplyNameImplications(tag.node.name, target, true, prefix)

    else if(tag.isStringLiteral() || tag.isTemplateLiteral()){
        ApplyNameImplications("string", target);
        ApplyNameImplications(Opts.env == "native" ? Shared.stack.helpers.Text : "span", target, true)

        target.add(tag)
        preventDefaultPolyfill(tag);
    }

    else throw Error.BadExpression(tag);
}

function UnwrapExpression(
    expression: Path<Expression>,
    target: ElementInline ): Path<Expression> {

    let current = expression;
    while(!inParenthesis(current)) 
        switch(current.type){

        case "TaggedTemplateExpression": {
            const exp = current as Path<TaggedTemplateExpression>;
            const quasi = exp.get("quasi");
            let content: Expression = quasi.node;

            if(content.expressions.length === 0 &&
               containsLineBreak.test(content.quasis[0].value.cooked) === false){
                const text = content.quasis[0].value.cooked;
                content = stringLiteral(text);
            }

            target.add(content)

            current = exp.get("tag");
            preventDefaultPolyfill(exp);
            break;
        }

        case "CallExpression": {
            const exp = current as Path<CallExpression>;
            const args = exp.get("arguments");
            ParseProps( 
                args as Path<ListElement>[],
                target
            );
            current = exp.get("callee");
            break;
        }

        case "MemberExpression": {
            const exp = current as Path<MemberExpression>;
            const selector = exp.get("property") as Path;
            if(exp.node.computed !== true && selector.isIdentifier())
                ApplyNameImplications(selector.node.name, target);
            else 
                throw Error.SemicolonRequired(selector)

            return exp.get("object");
            break;
        }

        default: 
            return current;
    }

    return current;
}

function ParseProps(
    props: Path<ListElement>[],
    target: ElementInline ){

    if(!props) return;
    for(let path of props){

        if(IsJustAValue(path as Path<Expression>)){
            target.add(path as Path<Expression>)
            continue;
        }

        switch(path.type){
            case "DoExpression":
                (path.node as DoExpressive).meta = target;
                target.doBlock = path.node as DoExpressive;
            break;

            case "TemplateLiteral":
            case "ExpressionLiteral":
            case "ArrowFunctionExpression": 
                target.add(path as Path<Expression>)
            break;

            case "ArrayExpression": {
                const array = path as Path<ArrayExpression>;

                for(const item of array.get("elements"))
                    if(item.isExpression())
                        target.add(item);
            }
            break;

            case "TaggedTemplateExpression": {
                const {tag, quasi} = path.node as TaggedTemplateExpression;
    
                if(tag.type != "Identifier") 
                    throw Error.PropNotIdentifier(path)
    
                target.add(
                    new Prop(
                        tag.name,
                        quasi.expressions.length == 0
                        ? stringLiteral(quasi.quasis[0].value.raw)
                        : quasi
                    )
                )
                
                preventDefaultPolyfill(path);
            } break;

            case "AssignmentExpression": {
                const assign = path as Path<AssignmentExpression>;
                const name = assign.get("left");
                const value = assign.get("right");

                if(!name.isIdentifier())
                    throw Error.AssignOnlyIdent(name);

                target.add(new Prop(name.node.name, value.node));
            } break;

            case "Identifier": {
                const { node } = path as Path<Identifier>;
                target.add(
                    new Prop(node.name, node)
                );
            } break;

            case "SpreadElement": 
                target.add(
                    new Prop(false, (<SpreadElement>path.node).argument)
                );
            break;

            case "ObjectExpression": {
                const properties = (path as Path<ObjectExpression>).get("properties");

                for(const property of properties){
                    let insert: Prop;
                    
                    if(property.isObjectProperty()){
                        const key = property.node.key;
                        const value = property.get("value")
                        const name: string = key.value || key.name;

                        if(!value.isExpression())
                            throw Error.BadObjectKeyValue(value, value.type);

                        insert = new Prop(name, value.node)
                    }
                    
                    else if(property.isSpreadElement()){
                        insert = new Prop(false, property.node.argument);
                        preventDefaultPolyfill(property);
                    } 
                    
                    else if(property.isObjectMethod()){
                        const node = property.node;
                        const func = Object.assign(
                            { id: null, type: "FunctionExpression" }, 
                            node as any
                        );
                        insert = new Prop(node.key, func as FunctionExpression)
                    }

                    target.add(insert!)
                }
            } break;

            case "UnaryExpression": {
                const unary = path as Path<UnaryExpression>;
                const value = path.get("argument") as Path<Expression>;
                switch(unary.node.operator){
                    case "+": 
                        if(value.isIdentifier())
                            target.add(
                                new Prop(value.node.name, value.node)
                            );
                        else 
                            throw Error.BadShorthandProp(unary);
                    break;

                    case "-":
                        target.add(
                            new Prop("className", value.node)
                        );
                    break;

                    case "~": 
                        target.add(
                            new ExplicitStyle(false, value.node)
                        );
                    break
                }
            } break;

            default: 
                throw Error.PropUnknown(path, path.type);
        }
    }
}