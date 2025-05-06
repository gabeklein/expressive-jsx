import { Rule } from 'eslint';
// import { JSXOpeningElement } from 'estree-jsx';

import { isStandard } from './tag';

const jsxMustBeReturnedRule: Rule.RuleModule = {
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

          parent = parent.parent
        }

        if (
          parent &&
          expression &&
          ['JSXElement', 'JSXFragment'].includes(expression.type)
        ) {
          context.report({
            node,
            messageId: 'mustReturn',
            fix(fixer) {
              return fixer.replaceText(node, 
                `return (${context.sourceCode.getText(expression)})`
              )
            }
          })
        }
      }
    }
  }
}

const jsxTagNameMustBeValid: Rule.RuleModule = {
  meta: {
    type: 'problem',
    fixable: 'code',
    docs: {
      description: 'JSX tag names must be valid HTML5 or SVG tags',
      recommended: true,
    },
    schema: [],
    messages: {
      invalidTag: 'JSX tag name "{{tag}}" is not a valid HTML5 or SVG tag. Converting to div with {{tag}} as an attribute.',
    },
  },
  create(context: Rule.RuleContext) {
    return {
      JSXOpeningElement(node: any) {
        // Skip if no name or not a simple identifier
        if (!node.name || node.name.type !== 'JSXIdentifier')
          return;

        const tag = node.name.name;

        // Skip React components (uppercase first letter)
        if (/^[A-Z]/.test(tag))
          return;

        // Skip valid HTML5/SVG tags
        if (isStandard(tag) || tag === 'this')
          return;

        context.report({
          node: node.name,
          messageId: 'invalidTag',
          data: { tag },
          fix(fixer) {
            const fixes = [];

            // Replace tag name with 'div'
            fixes.push(fixer.replaceText(node.name, 'div'));

            // Add invalid tag as attribute immediately after tag name
            const insertPos = node.name.range[1];
            
            // Sanitize tag name for attribute (remove invalid chars)
            const safeAttr = tag.replace(/[^a-zA-Z0-9-]/g, '');
            fixes.push(fixer.insertTextAfterRange([insertPos, insertPos], ` ${safeAttr}`));

            // Fix closing tag if not self-closing
            if (!node.selfClosing && node.parent?.closingElement?.name)
              fixes.push(fixer.replaceText(node.parent.closingElement.name, 'div'));

            return fixes;
          },
        });
      },
    };
  },
};

export default {
  rules: {
    'jsx-must-return': jsxMustBeReturnedRule,
    'no-style-tag': jsxTagNameMustBeValid,
  },
  configs: {
    recommended: {
      plugins: ['@expressive/jsx'],
      rules: {
        '@expressive/jsx/jsx-must-return': 'error',
        '@expressive/jsx/no-style-tag': 'error'
      }
    }
  }
}