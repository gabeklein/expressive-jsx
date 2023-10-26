import type { Node, NodePath } from "@babel/traverse";

export function ensureUID(path: NodePath<Node>, name = "temp"){
  const { scope } = path;

  let uid = name = name
    .replace(/^_+/, "")
    .replace(/[0-9]+$/g, "");

  for(let i = 2;
    scope.hasBinding(uid) ||
    scope.hasGlobal(uid) ||
    scope.hasReference(uid);
    i++
  ){
    uid = name + i;
  }

  const program = scope.getProgramParent() as any;
  program.references[uid] = true;
  program.uids[uid] = true;
  return uid;
}