import ts from "typescript/lib/tsserverlibrary";

// Helper function to find identifier at position
export function findIdentifierNodeAtPosition(sourceFile: ts.SourceFile, position: number): ts.Identifier | undefined {
  function find(node: ts.Node): ts.Identifier | undefined {
    if (node.kind === ts.SyntaxKind.Identifier && 
        node.getStart() <= position && 
        position < node.getEnd()) {
      return node as ts.Identifier;
    }
    
    return ts.forEachChild(node, find);
  }
  
  return find(sourceFile);
}

// Helper function to find a node at a specific position
export function findNodeAtPosition(sourceFile: ts.SourceFile, position?: number): ts.Node | undefined {
  function find(node: ts.Node): ts.Node | undefined {
    if(position === undefined)
      return undefined;

    if (node.getStart() <= position && position < node.getEnd()) {
      // Look for a more specific child node at this position
      const childNodeAtPos = ts.forEachChild(node, find);
      return childNodeAtPos || node;
    }

    return undefined;
  }
  
  return find(sourceFile);
}

// Helper function to check if a position is within a label statement
export function isPositionInLabelStatement(sourceFile: ts.SourceFile, position: number): { isInLabel: boolean; identifierName: string | null } {
  let result = { isInLabel: false, identifierName: null as string | null };
  
  function visit(node: ts.Node) {
    if (result.isInLabel) return; // Already found

    // Check if it's an identifier within our position
    if (node.kind === ts.SyntaxKind.Identifier && 
        node.getStart(sourceFile) <= position && 
        position < node.getEnd()) {
      const identifier = node as ts.Identifier;
      
      // Check if this identifier is a child of a label statement or sequence expression
      let parent = node.parent;
      while (parent) {
        if (parent.kind === ts.SyntaxKind.LabeledStatement) {
          result = { isInLabel: true, identifierName: identifier.text };
          return;
        }
        // Also check if it's part of a sequence inside a label
        if (parent.kind === ts.SyntaxKind.SyntaxList || 
            parent.kind === ts.SyntaxKind.Block || 
            parent.kind === ts.SyntaxKind.ExpressionStatement ||
            parent.kind === ts.SyntaxKind.BinaryExpression) { // Include binary expressions (comma operator)
          // Continue up to see if we're ultimately in a label
          parent = parent.parent;
          continue;
        }
        break;
      }
    }
    
    ts.forEachChild(node, visit);
  }
  
  visit(sourceFile);
  return result;
}

export function isExpressionInLabelStatement(sourceFile: ts.SourceFile, node: ts.Node): boolean {
  let parent = node.parent;

  while (parent) {
    if (parent.kind === ts.SyntaxKind.LabeledStatement)
      return true;
    
    // These kinds of nodes can be part of label statement structure
    if (parent.kind === ts.SyntaxKind.SyntaxList || 
        parent.kind === ts.SyntaxKind.Block || 
        parent.kind === ts.SyntaxKind.ExpressionStatement ||
        parent.kind === ts.SyntaxKind.BinaryExpression) {
      parent = parent.parent;
      continue;
    }
    
    break;
  }
  
  return false;
}

// Helper function to check if a label contains normal control flow constructs like loops
export function labelContainsNormalControlFlow(labeledStatement: ts.LabeledStatement): boolean {
  let containsNormalConstruct = false;
  
  function checkForControlFlow(node: ts.Node) {
    // Check for normal control flow constructs
    switch (node.kind) {
      case ts.SyntaxKind.ForStatement:
      case ts.SyntaxKind.ForInStatement:
      case ts.SyntaxKind.ForOfStatement:
      case ts.SyntaxKind.WhileStatement:
      case ts.SyntaxKind.DoStatement:
      case ts.SyntaxKind.SwitchStatement:
      case ts.SyntaxKind.BreakStatement:
      case ts.SyntaxKind.ContinueStatement:
        containsNormalConstruct = true;
        return;
    }
    
    // Skip checking children if we already found a normal construct
    if (!containsNormalConstruct)
      ts.forEachChild(node, checkForControlFlow);
  }
  
  // Check the statement part of the labeled statement
  checkForControlFlow(labeledStatement.statement);
  
  return containsNormalConstruct;
}

export function isInJsxElement(sourceFile: ts.SourceFile, position?: number): boolean {
  if (position === undefined) return false;
  
  const node = findNodeAtPosition(sourceFile, position);
  if (!node) return false;
  
  // Walk up the tree to find if we're in a JSX element
  let current: ts.Node | undefined = node;
  while (current) {
    // Check for JSX attribute or JSX element
    if (current.kind === ts.SyntaxKind.JsxAttribute || 
        current.kind === ts.SyntaxKind.JsxElement || 
        current.kind === ts.SyntaxKind.JsxSelfClosingElement ||
        current.kind === ts.SyntaxKind.JsxOpeningElement) {
      return true;
    }
    current = current.parent;
  }
  
  return false;
}

export function flattenMessage(messageText: string | ts.DiagnosticMessageChain): string {
  let text = "";

  while(messageText) {
    if (typeof messageText === 'string') {
      text += messageText;
      break;
    }
    
    text += messageText.messageText;
    messageText = messageText.next?.[0]!;
  }

  return text;
}
