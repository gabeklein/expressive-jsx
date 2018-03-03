const { AttrubutesBody } = require("./component");
const { createHash } = require('crypto');
const t = require("babel-types");
const { Opts, Shared, transform } = require("./shared");

export class ComponentModifier extends AttrubutesBody {

    inlineType = "stats"
    precedence = 0

    static applyTo(parent, path){
        const { name } = path.node.label;
        const attr = new this(path, parent, name);
        parent.context[name] = attr;
        parent.add(attr);
    }

    static generateJSXStyleNode(mods){}

    constructor(path, parent, name){
        super(...arguments)

        this.name = name
        this.hid = createHash("md5")
            .update(path.getSource())
            .digest('hex')
            .substring(0, 6);
    }   

    insertDoIntermediate(path){
        const doTransform = t.doExpression(
            path.node.body
        );

        doTransform.meta = this;
        this.doTransform = doTransform;

        path.replaceWith(
            t.expressionStatement(
                t.sequenceExpression([
                    t.nullLiteral(),
                    doTransform

                ])
            )
        )
    }

    didEnterOwnScope(path){
        this.scope = path.scope

        super.didEnterOwnScope(path)

        const root = this.context.root;
        // root.classifiedStyles[`__${this.hid}`] = this;
    }

    didExitOwnScope(path){
        this.parent.context[this.name] = this;
        if(this.props.length && this.style.length)
            this.hasBoth = true;

        // const styles = this.output();

        // if(styles)
        //     this.id = this.context.root.declareStyle(styles)

        // path.parentPath.remove()
    }

    output(){
        if(Opts.styleMode == "next")
            return false;

        let { props, style } = this;
        let declaration;

        props = props.length && t.objectExpression(props.map(x => x.asProperty));
        style = style.length && t.objectExpression(style.map(x => x.asProperty));

        if(style && props){
            this.hasBoth = true;
            declaration = t.objectExpression([
                t.objectProperty(t.identifier("props"), props),
                t.objectProperty(t.identifier("style"), style)
            ])
        } else if(props){
            declaration = props;
            this.type = "props";
        } else if(style){
            declaration = style;
            this.type = "style";
        }

        const id = this.id = this.scope.generateUidIdentifier(this.name)

        // return declaration

        if(declaration)
            return t.variableDeclaration("const", [
                t.variableDeclarator(
                    id, declaration
                )
            ])
    }

    into(inline, classlist){
        const { style, props } = inline;
        const { id } = this; 
        if(this.hasBoth){
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
    LabeledBlockStatement(path){
        throw path.buildCodeFrameError("I'm sorry Dave but I can't do that.")
    }
}
