const { AttrubutesBody } = require("./component");
const { createHash } = require('crypto');
const t = require("babel-types");
const { Opts, Shared, transform } = require("./shared");

class ComponentModifier extends AttrubutesBody {

    precedence = 0

    constructor(name, body, inherited){
        super(body)
        this.name = name;
        if(inherited)
            this.inherits = inherited;
    }   

    declare(recipient){
        recipient.context.declare(this);
    }

    insertDoIntermediate(path){
        const doTransform = t.doExpression(
            path.node
        );

        doTransform.meta = this;
        this.doTransform = doTransform;

        path.replaceWith(
            t.expressionStatement(doTransform)
        )
    }

    didEnterOwnScope(path){
        this.scope = path.scope
        super.didEnterOwnScope(path)
    }

    didExitOwnScope(){
        if(this.props.length)
            this.type = "props"
        if(this.style.length)
            this.type = this.type ? "both" : "style"
    }
}

class WebComponentModifier extends ComponentModifier {

    constructor(name, body, inherited) {
        super(...arguments)
        this.insertDoIntermediate(path)
        this.hash = createHash("md5")
            .update(path.getSource())
            .digest('hex')
            .substring(0, 6);
    }

    generateJSXStyleNode(){
        
    }

    declare(recipient){
        super.declare(recipient)
        // recipient.context.root.declareStyle
    }
    
}

class NativeComponentModifier extends ComponentModifier {

    inlineType = "stats"

    declare(recipient){
        super.declare(recipient);
        recipient.add(this);
    }

    get handler(){
        return (body, recipient) => {
            if(body == false){
                return
            }
            if(body.isBlockStatement()){
                const usingName = this.name;
                const inheriting = this;
                new Modifier(usingName, body, inheriting).declare(recipient);
            }
        }
    }

    output(){
        let { props, style } = this;
        let declaration;

        props = props.length && t.objectExpression(props.map(x => x.asProperty));
        style = style.length && t.objectExpression(style.map(x => x.asProperty));

        declaration = 
            ( this.type == "both" )
            ? t.objectExpression([
                t.objectProperty(t.identifier("props"), props),
                t.objectProperty(t.identifier("style"), style)
            ]) 
            : props || style;

        if(declaration){
            const id = this.id = this.scope.generateUidIdentifier(this.name)
            return t.variableDeclaration("const", [
                t.variableDeclarator(
                    id, declaration
                )
            ])
        }
    }

    into(inline){

        if(this.also) this.also.into(inline);

        const { style, props, css } = inline;
        const { id } = this; 
        
        if(this.props.length && this.style.length){
            props.push(t.spreadProperty(
                t.memberExpression(
                    id, t.identifier("props")
                )
            ))
            style.push(t.spreadProperty(
                t.memberExpression(
                    id, t.identifier("style")
                )
            ))
        }
        else {
            inline[this.type].push(
                t.spreadProperty(id)
            );
        }
    }
}

export const Modifier = 
    Opts.reactEnv != "native"
        ? NativeComponentModifier 
        : WebComponentModifier;