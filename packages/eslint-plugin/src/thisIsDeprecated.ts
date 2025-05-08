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
            type: ['string', 'undefined'],
            enum: ['fragment', 'div', 'skip', undefined],
            default: undefined,
            description: 'How to fix <this>: fragment (default), div, skip, or undefined (default).'
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
    // Allow ambiguous to be undefined and default to undefined
    const ambiguous = options.ambiguous;

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

            if (!node.attributes.length && ambiguous !== 'div') {
              if(ambiguous === 'fragment' || componentHasOwnStyle(node, context)) {
                const children = parent.children.filter((c: any) => c.type !== 'JSXText' || c.value.trim() !== '');
        
                if (children.length === 1 && children[0].type === 'JSXElement')
                  return fixer.replaceText(parent, context.sourceCode.getText(children[0]));
  
                const fixes = [fixer.replaceText(node.name, '')];
  
                if (node.parent?.closingElement?.name)
                  fixes.push(fixer.replaceText(node.parent.closingElement.name, ''));
  
                return fixes;
              }

              if (ambiguous === 'skip')
                return null;
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

function componentHasOwnStyle(node: any, context: Rule.RuleContext) {
  const { sourceCode } = context;
  // Find the nearest function ancestor
  const functionAncestor = sourceCode.getAncestors(node).reverse().find((ancestor) =>
    ancestor.type === 'FunctionDeclaration' ||
    ancestor.type === 'FunctionExpression' ||
    ancestor.type === 'ArrowFunctionExpression'
  );

  if (!functionAncestor || !functionAncestor.body || functionAncestor.body.type !== 'BlockStatement')
    return false;

  // Check for a LabeledStatement with an ExpressionStatement as its body
  return functionAncestor.body.body.some((child: any) =>
    child.type === 'LabeledStatement' && child.body.type === 'ExpressionStatement'
  );
}