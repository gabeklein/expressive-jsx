import { Rule } from 'eslint';
import * as ESTree from 'estree';

export const labelSpacing: Rule.RuleModule = {
  meta: {
    fixable: 'whitespace',
    type: 'layout',
    docs: {
      description: 'Ensure spacing above and below Label statements with a simple block of labels',
      recommended: false
    },
    schema: [],
    messages: {
      spacing: 'Label statement with a block of labels must have a blank line above and below.'
    }
  },
  create(context) {
    const { sourceCode } = context;

    return {
      LabeledStatement(node: ESTree.Node) {
        // @ts-ignore
        if (!isBlockWithLabels(node.body!)) return;
        if (!node.loc) return;
        const lines = sourceCode.lines;
        const nodeEnd = node.loc.end.line - 1;

        const ancestors = sourceCode.getAncestors(node);
        const parent = ancestors.length > 0 ? ancestors[ancestors.length - 1] : null;
        const isLastInBlock = parent &&
          parent.type === 'BlockStatement' &&
          Array.isArray(parent.body) &&
          parent.body[parent.body.length - 1] === node;

        const nextLine = nodeEnd < lines.length - 1 ? lines[nodeEnd + 1] : '';
        const needsBlankBelow = !isLastInBlock && nextLine.trim() !== '';

        if (!needsBlankBelow) return;

        context.report({
          node,
          messageId: 'spacing',
          fix(fixer) {
            return fixer.insertTextAfter(node, '\n');
          }
        });
      }
    };
  }
};

function isLabel(node: any) {
  return node.type === 'LabeledStatement';
}

function isBlockWithLabels(node: any) {
  return node && node.type === 'BlockStatement' && node.body.every(isLabel);
}