import ts from "typescript/lib/tsserverlibrary";
import { findNodeAtPosition, isExpressionInLabelStatement } from "./util";

export function expressionInLabelStatement(diagnostic: ts.Diagnostic): boolean {
  const sourceFile = diagnostic.file!;
  if(diagnostic.code !== 2695)
    return false;
  const node = findNodeAtPosition(sourceFile, diagnostic.start);
  if (node)
    return isExpressionInLabelStatement(sourceFile, node);
  return false;
}
