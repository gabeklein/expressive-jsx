export function hoistLabeled(node: Program){
    const labeled = [] as LabeledStatement[];
    const other = [] as Statement[];

    let shouldHoist = false;
    let nonLabelFound = false;

    for(const item of node.body){
        if(item.type == "LabeledStatement"){
            shouldHoist = nonLabelFound;
            labeled.push(item);
        }
        else {
            nonLabelFound = true;
            other.push(item as any);
        }
    }

    if(shouldHoist)
        node.body = [...labeled, ...other] as any[];
}

export function ensureUIDIdentifier(
    this: Scope,
    name: string = "temp", 
    useExisting: boolean, 
    didUse: BunchOf<any>){

    name = name.replace(/^_+/, "").replace(/[0-9]+$/g, "");
    let uid;
    let i = 0;

    if(useExisting){
        if(this.hasBinding(uid = name)){
            didUse[uid] = null;
            return t.identifier(uid);
        }
    } else 
        do {
            uid = name + (i > 1 ? i : "");
            i++;
        } 
        while (
            this.hasBinding(uid) || 
            this.hasGlobal(uid) || 
            this.hasReference(uid)
        );

    const program = this.getProgramParent() as any;
    program.references[uid] = true;
    program.uids[uid] = true;
    return t.identifier(uid);
}