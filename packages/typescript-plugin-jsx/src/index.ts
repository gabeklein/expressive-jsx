import ts from 'typescript/lib/tsserverlibrary';

import {
  expressionInLabelStatement,
  findIdentifierNodeAtPosition,
  findLabeledStatementNode,
  findNodeAtPosition,
  isExpressionInLabelStatement,
  isPositionInLabelStatement,
  stylePropertyValue,
  labelContainsNormalControlFlow,
} from './util';

function init(modules: { typescript: typeof ts }) {
  const { ScriptElementKind } = modules.typescript;
  
  function create(info: ts.server.PluginCreateInfo) {
    const { languageService: service } = info;
    const { logger } = info.project.projectService;
    
    logger.info("Loaded Expressive JSX Typescript Plugin");

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
          if (stylePropertyValue(diagnostic)) 
            return false;
          
          if (expressionInLabelStatement(diagnostic))
            return false;
        }
        catch(e){
          logger.info("Error in getSemanticDiagnostics: " + e);
        }

        return true;
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

export = init;

