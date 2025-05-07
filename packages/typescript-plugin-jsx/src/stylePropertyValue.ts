import ts from "typescript/lib/tsserverlibrary";
import { isPositionInLabelStatement } from "./util";

export function stylePropertyValue(diagnostic: ts.Diagnostic): boolean {
  const sourceFile = diagnostic.file!;
  if (diagnostic.code !== 2304) return false;
  const position = diagnostic.start;
  if (!position) return false;
  const labelCheck = isPositionInLabelStatement(sourceFile, position);
  if (labelCheck.isInLabel) {
    const messageText =
      typeof diagnostic.messageText === "string"
        ? diagnostic.messageText
        : diagnostic.messageText.messageText;
    const match = messageText.match(/Cannot find name ['"]([^'"]+)['"]/);
    const identifierInError = match ? match[1] : null;
    if (identifierInError && identifierInError === labelCheck.identifierName)
      return true;
  }
  return false;
}
