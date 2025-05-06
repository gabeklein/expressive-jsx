import { Rule } from 'eslint';

export const jsxMustReturn: Rule.RuleModule = {
  meta: {
    fixable: "code",
    type: 'problem',
    docs: {
      description: 'JSX elements must be returned, not left floating in a function',
      recommended: true
    },
    schema: [],
    messages: {
      mustReturn: 'JSX element is not returned. Did you mean to return it?'
    }
  },
  create(context: Rule.RuleContext) {
    return {
      ExpressionStatement(node) {
        const expression = node.expression as any;
        let parent = node.parent;

        // Only check inside functions
        while (parent) {
          if ([
            'FunctionDeclaration',
            'FunctionExpression',
            'ArrowFunctionExpression'
          ].includes(parent.type))
            break;

          parent = parent.parent;
        }

        if (parent &&
          expression &&
          ['JSXElement', 'JSXFragment'].includes(expression.type)) {
          context.report({
            node,
            messageId: 'mustReturn',
            fix(fixer) {
              return fixer.replaceText(node,
                `return (${context.sourceCode.getText(expression)})`
              );
            }
          });
        }
      }
    };
  }
};
