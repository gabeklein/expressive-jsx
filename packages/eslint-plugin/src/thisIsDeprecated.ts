import { Rule } from 'eslint';

export const thisIsDeprecated: Rule.RuleModule = {
  meta: {
    type: 'problem',
    fixable: 'code',
    docs: {
      description: 'The <this> JSX element and bare this attribute are deprecated. Use fragments or explicit props forwarding instead.',
      recommended: true,
    },
    schema: [
      {
        type: 'object',
        properties: {
          ambiguous: {
            type: 'string',
            enum: ['fragment', 'div', 'skip'],
            default: 'fragment',
            description: 'How to fix <this>: fragment (default), div, or skip.'
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      deprecatedThisElement: '<this> JSX element is deprecated. Use fragments (<>...</>) instead.'
    },
  },
  create(context: Rule.RuleContext) {
    const options = context.options && context.options[0] || {};
    const ambiguous = options.ambiguous || 'fragment';

    return {
      JSXOpeningElement(node: any) {
        const tag = node.name;

        if (!tag || tag.type !== 'JSXIdentifier' || tag.name !== 'this')
          return;

        context.report({
          node: tag,
          messageId: 'deprecatedThisElement',
          fix(fixer) {
            const { parent } = node;

            // TODO: strict mode should also check if parent component has styles defined.

            if (!node.attributes.length) {
              if (ambiguous === 'skip')
                return null;

              if(ambiguous === 'fragment') {
                const children = parent.children.filter((c: any) => c.type !== 'JSXText' || c.value.trim() !== '');
        
                if (children.length === 1 && children[0].type === 'JSXElement')
                  return fixer.replaceText(parent, context.sourceCode.getText(children[0]));
  
                const fixes = [fixer.replaceText(node.name, '')];
  
                if (node.parent?.closingElement?.name)
                  fixes.push(fixer.replaceText(node.parent.closingElement.name, ''));
  
                return fixes;
              }
            }

            const fixes = [fixer.replaceText(tag, 'div this')]
  
            if (!node.selfClosing && parent?.closingElement?.name)
              fixes.push(fixer.replaceText(parent.closingElement.name, 'div'));

            return fixes;
          }
        });
      }
    };
  },
};
