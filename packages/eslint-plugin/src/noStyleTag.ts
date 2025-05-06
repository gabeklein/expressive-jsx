import { Rule } from 'eslint';
import { isStandard } from './tag';

export const noStyleTag: Rule.RuleModule = {
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
