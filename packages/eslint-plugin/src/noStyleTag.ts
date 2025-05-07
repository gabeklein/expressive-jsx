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
        if (!node.name || node.name.type !== 'JSXIdentifier')
          return;

        const tag = node.name.name;

        if (/^[A-Z]/.test(tag))
          return;

        if (isStandard(tag) || tag === 'this')
          return;

        context.report({
          node: node.name,
          messageId: 'invalidTag',
          data: { tag },
          fix(fixer) {
            const safeAttr = tag.replace(/[^a-zA-Z0-9-]/g, '');
    
            const fixes = [
              fixer.replaceText(node.name, `div ${safeAttr}`)
            ];

            if (!node.selfClosing && node.parent?.closingElement?.name)
              fixes.push(fixer.replaceText(node.parent.closingElement.name, 'div'));

            return fixes;
          },
        });
      },
    };
  },
};
