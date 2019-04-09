import t, {
    Expression,
    Identifier,
    ImportDefaultSpecifier,
    ImportNamespaceSpecifier,
    ImportSpecifier,
    ObjectProperty,
    Program,
} from '@babel/types';
import { ensureUID, ensureUIDIdentifier } from 'helpers';
import { BunchOf, Path } from 'types';

type ImportSpecific = ImportSpecifier | ImportDefaultSpecifier | ImportNamespaceSpecifier;

export interface ExternalsManager {
    ensure(
        from: string, 
        name: string,
        alt?: string
    ): Identifier;

    ensureImported(
        from: string,
        after?: number): void;

    EOF(): void;
}

export class ImportManager
    implements ExternalsManager {

    imports = {} as BunchOf<ImportSpecific[]>
    importIndices = {} as BunchOf<number>
    body = this.path.node.body;
    scope = this.path.scope;

    constructor(
        protected path: Path<Program>
    ){}

    ensure(
        from: string, 
        name: string,
        alt?: string){

        let uid;
        const list = this.imports[from] || this.ensureImported(from);

        if(name == "default"){
            if(t.isImportDefaultSpecifier(list[0]))
                return list[0].local;
            else {
                uid = ensureUIDIdentifier(this.scope, alt || from);
                list.unshift(t.importDefaultSpecifier(uid));
                return uid
            }
        }

        for(const spec of list)
            if("imported" in spec 
            && spec.imported.name == name){
                uid = t.identifier(spec.local.name);
                break;
            }
    
        if(!uid){
            uid = ensureUIDIdentifier(this.scope, alt || name);
            list.push(
                t.importSpecifier(uid, t.identifier(name))
            )
        }
    
        return uid;
    }

    ensureImported(
        from: string,
        after?: number){

        for(const statement of this.body)
            if(statement.type == "ImportDeclaration" 
            && statement.source.value == from)
                return this.imports[from] = statement.specifiers

        this.importIndices[from] = after || 0;
        return this.imports[from] = [];
    }

    EOF(){
        const requireOccuring = Object
            .entries(this.importIndices)
            .sort((a,b) => a[1] - b[1])
            .map(x => x[0]);

        for(const name of requireOccuring){
            const list = this.imports[name];
            const index = this.importIndices[name];

            if(list.length == 0)
                continue

            this.body.splice(index, 0,
                t.importDeclaration(list, t.stringLiteral(name))
            )
        }
    }
}

export class RequirementManager 
    implements ExternalsManager {

    imports = {} as BunchOf<ObjectProperty[]>
    importTargets = {} as BunchOf<Expression | false>
    importIndices = {} as BunchOf<number>
    body = this.path.node.body;
    scope = this.path.scope;
    
    constructor(
        protected path: Path<Program>
    ){}

    ensure(
        from: string, 
        name: string,
        alt?: string){
        
        const source = this.imports[from] || this.ensureImported(from);

        if(!alt)
        for(const item of source)
            if(t.isIdentifier(item.key, { name })
            && t.isIdentifier(item.value))
                return item.value;

        const uid = ensureUID(this.scope, alt || name);
        const ref = t.identifier(uid);
        
        source.push(
            t.objectProperty(
                t.identifier(name),
                ref,
                false,
                uid === name
            )
        )

        return ref;
    }

    ensureImported(
        from: string,
        after?: number
    ){
        let target;
        let insertableAt;
        let list;

        for(let i = 0, stat; stat = this.body[i]; i++)
        if(t.isVariableDeclaration(stat))
        for(const { init, id } of stat.declarations)
        if(t.isCallExpression(init)
        && t.isIdentifier(init.callee, { name: "require" })
        && t.isStringLiteral(init.arguments[0], { value: from })){
            target = id;
            insertableAt = i + 1;
        }

        if(t.isObjectPattern(target))
            list = this.imports[from] = target.properties as ObjectProperty[];
        else {
            list = this.imports[from] = [];

            this.importIndices[from] = insertableAt || 0;

            this.importTargets[from] =
                t.isIdentifier(target) && target;
        }
        
        return list;
    }

    EOF(){
        const requireOccuring = Object
            .entries(this.importIndices)
            .sort((a,b) => a[1] - b[1])
            .map(x => x[0]);

        for(const name of requireOccuring){
            const list = this.imports[name]
            if(list.length == 0)
                continue
            
            const index = this.importIndices[name];
            const target = this.importTargets[name];

            this.body.splice(
                index, 0, 
                t.variableDeclaration("const", [
                    t.variableDeclarator(
                        t.objectPattern(list), 
                        target || t.callExpression(
                            t.identifier("require"),
                            [ t.stringLiteral(name) ]
                        )
                    )
                ])
            )
        }
    }
}