import ts from "typescript/lib/tsserverlibrary";

function init(modules: { typescript: typeof ts }) {
  const { ScriptElementKind } = modules.typescript;
  
  function create(info: ts.server.PluginCreateInfo) {
    const { languageService: service, project } = info;
    
    project.projectService.logger.info("Loaded Expressive JSX Typescript Plugin");

    // Set up decorator object
    const proxy: ts.LanguageService = Object.create(null);

    for (const k of Object.keys(service) as Array<keyof ts.LanguageService>) {
      const x = service[k]!;
      // @ts-expect-error - JS runtime trickery which is tricky to type tersely
      proxy[k] = (...args: Array<{}>) => x.apply(service, args);
    }

    proxy.getSuggestionDiagnostics = (fileName) => {
      const originalDiagnostics = service.getSuggestionDiagnostics(fileName);
      const sourceFile = service.getProgram()?.getSourceFile(fileName);

      if (!sourceFile) return originalDiagnostics;

      return originalDiagnostics.filter(diagnostic => {
        // Handle "Unused label" warnings (code 7028)
        if (diagnostic.code === 7028) {
          // Find the labeled statement for this warning
          const labeledStatement = findLabeledStatementNode(sourceFile, diagnostic.start);

          if (labeledStatement && !labelContainsNormalControlFlow(labeledStatement))
            return false;
        }

        return true;
      })
    }
  
    // Override getSemanticDiagnostics to filter out identifier errors and comma operator warnings within label statements
    proxy.getSemanticDiagnostics = (fileName) => {
      const originalDiagnostics = service.getSemanticDiagnostics(fileName);
      const sourceFile = service.getProgram()?.getSourceFile(fileName);
      
      if (!sourceFile) return originalDiagnostics;

      return originalDiagnostics.filter(diagnostic => {
        try {
          const { start, code } = diagnostic;
          const message = flattenMessage(diagnostic.messageText);
  
          
          // Handle "Cannot find name" errors (code 2304)
          if (code === 2304 && isStylePropertyValue(diagnostic, sourceFile)) 
            return false;
  
          // Handle void function used as JSX component error (code 2786)
          if (code === 2786)
            // Check if this is the void return error for JSX
            if (message.includes("cannot be used as a JSX component") && (
              message.includes("Its return type 'void' is not a valid JSX element") ||
              message.includes("Its type 'undefined' is not a valid JSX element type") ||
              message.includes("Type 'void' is not assignable to type 'ReactNode'")
            )) {
              return false; // Suppress this diagnostic
            }

          if (code === 2322)
            // Check if this is a property assignment type error in JSX
            if (message.includes("is not assignable to type") && message.includes("Property") && 
                message.includes("does not exist on type") && isInJsxElement(sourceFile, start)) {
              return false; // Suppress this diagnostic
            }
          
          // Handle "Left side of comma operator is unused and has no side effects" errors (code 2695)
          if (code === 2695){
            const nodeAtDiagnosticPos = findNodeAtPosition(sourceFile, start);
    
            if (nodeAtDiagnosticPos && isExpressionInLabelStatement(sourceFile, nodeAtDiagnosticPos))
              return false;
          }
          
          return true;

        }
        catch(e){
          project.projectService.logger.info("Error in getSemanticDiagnostics: " + e);
          return true;
        }
      });
    };

    // Override getQuickInfoAtPosition to provide type information for identifiers in label statements
    proxy.getQuickInfoAtPosition = (fileName, position) => {
      const sourceFile = service.getProgram()?.getSourceFile(fileName);
      if (sourceFile) {
        // Check if the position is inside a label statement
        const labelCheck = isPositionInLabelStatement(sourceFile, position);
        
        if (labelCheck.isInLabel && labelCheck.identifierName) {
          // Find the identifier node
          const identifierNode = findIdentifierNodeAtPosition(sourceFile, position);
          
          if (identifierNode) {
            // Create a custom quickInfo for the identifier
            return {
              kind: ScriptElementKind.constElement,
              kindModifiers: 'declare',
              textSpan: {
                start: identifierNode.getStart(),
                length: identifierNode.getWidth()
              },
              displayParts: [
                { text: `"${identifierNode.text}"`, kind: 'stringLiteral' }
              ]
            };
          }
        }
      }
      
      return service.getQuickInfoAtPosition(fileName, position);
    };

    // Override semantic classifications to prevent dimming of unreachable expressions in label statements
    proxy.getEncodedSemanticClassifications = (fileName, span): ts.Classifications => {
      const original = service.getEncodedSemanticClassifications(fileName, span);
      const sourceFile = service.getProgram()?.getSourceFile(fileName);
      
      if (!sourceFile) return original;

      // TypeScript applies dimming via semantic classifications for unreachable code
      // We need to filter these classifications for nodes inside label statements

      // The classifications are encoded in a specific format by TypeScript
      // We'll convert them to a more usable format, filter, then convert back
      const { spans } = original;
      const modifiedSpans: number[] = [];

      for (let i = 0; i < spans.length; i += 3) {
        const start = spans[i];
        const length = spans[i + 1];
        const classification = spans[i + 2];
        
        // Check if this classification corresponds to a node inside a label statement
        // Classification 8 corresponds to unreachable code in TypeScript
        // Classification 16 corresponds to unused declarations (like unused labels)
        const isUnreachableCode = (classification & 8) !== 0;
        const isUnusedDeclaration = (classification & 16) !== 0;
        
        const position = start + span.start;
        const nodeAtPosition = findNodeAtPosition(sourceFile, position);
        
        if (isUnreachableCode && nodeAtPosition && isExpressionInLabelStatement(sourceFile, nodeAtPosition)) {
          // This is unreachable code inside a label statement - remove the unreachable flag
          const newClassification = classification & ~8; // Remove the unreachable flag
          modifiedSpans.push(start, length, newClassification);
          continue;
        }
        
        if (isUnusedDeclaration && nodeAtPosition) {
          // Check if this is a label identifier
          const parent = nodeAtPosition.parent;
          if (parent && parent.kind === ts.SyntaxKind.LabeledStatement) {
            const labeledStatement = parent as ts.LabeledStatement;
            // Only remove dimming if the label doesn't contain normal control flow constructs
            if (!labelContainsNormalControlFlow(labeledStatement)) {
              // This is an unused label without normal control flow - remove the unused flag
              const newClassification = classification & ~16; // Remove the unused flag
              modifiedSpans.push(start, length, newClassification);
              continue;
            }
          }
        }
        
        // Keep the classification as is
        modifiedSpans.push(start, length, classification);
      }
      
      return {
        spans: modifiedSpans,
        endOfLineState: original.endOfLineState
      };
    };

    return proxy;
  }
  
  return { create };
}

function isInJsxElement(sourceFile: ts.SourceFile, position?: number): boolean {
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

// Helper function to find a labeled statement node
function findLabeledStatementNode(sourceFile: ts.SourceFile, position: number): ts.LabeledStatement | undefined {
  function find(node: ts.Node): ts.LabeledStatement | undefined {
    if (node.kind === ts.SyntaxKind.LabeledStatement && 
        node.getStart(sourceFile) <= position && 
        position < node.getEnd()) {
      // If this is a labeled statement that contains our position
      return node as ts.LabeledStatement;
    }
    
    // Check children
    return ts.forEachChild(node, find);
  }
  
  return find(sourceFile);
}
    
// Function to check if a diagnostic is for an undeclared identifier in a label statement
function isStylePropertyValue(diagnostic: ts.Diagnostic, sourceFile: ts.SourceFile): boolean {
  const position = diagnostic.start;

  if(!position)
    return false;

  const labelCheck = isPositionInLabelStatement(sourceFile, position);
  
  if (labelCheck.isInLabel) {
    // Extract the identifier name from the message for verification
    const messageText = typeof diagnostic.messageText === 'string' 
      ? diagnostic.messageText 
      : diagnostic.messageText.messageText;
    
    // The message usually contains the identifier like "Cannot find name 'foo'"
    const match = messageText.match(/Cannot find name ['"]([^'"]+)['"]/);
    const identifierInError = match ? match[1] : null;
    
    // Double check that the identifier in the error matches the one we found
    if (identifierInError && identifierInError === labelCheck.identifierName)
      return true;
  }
  
  return false;
}
    
// Helper function to find identifier at position
function findIdentifierNodeAtPosition(sourceFile: ts.SourceFile, position: number): ts.Identifier | undefined {
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
function findNodeAtPosition(sourceFile: ts.SourceFile, position?: number): ts.Node | undefined {
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
function isPositionInLabelStatement(sourceFile: ts.SourceFile, position: number): { isInLabel: boolean; identifierName: string | null } {
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
    
// Helper to check if any expression is within a labeled statement
function isExpressionInLabelStatement(sourceFile: ts.SourceFile, node: ts.Node): boolean {
  if (!node) return false;
  
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

function flattenMessage(messageText: string | ts.DiagnosticMessageChain): string {
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

// Helper function to check if a label contains normal control flow constructs like loops
function labelContainsNormalControlFlow(labeledStatement: ts.LabeledStatement): boolean {
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
  
export = init;

