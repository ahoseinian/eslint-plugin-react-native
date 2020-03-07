/**
 * @fileoverview Detects inline styles
 * @author Aaron Greenwald
 */

'use strict';

const util = require('util');
const Components = require('../util/Components');
const styleSheet = require('../util/stylesheet');

const { StyleSheets } = styleSheet;
const { astHelpers } = styleSheet;

function getOpeningElement(node) {
  let n = node;
  while (n.parent) {
    if (n.type === 'JSXOpeningElement') {
      return n.name.name;
    }
    n = n.parent;
  }
}

module.exports = Components.detect((context) => {
  const styleSheets = new StyleSheets();

  function reportInlineStyles(inlineStyles) {
    if (inlineStyles) {
      inlineStyles.forEach((style) => {
        if (style) {
          const expression = util.inspect(style.expression);
          context.report({
            node: style.node,
            message: 'Inline style: {{expression}}',
            data: { expression },
            suggest: style.node.properties.every(
              (p) => p.value.type === 'Literal'
            )
              ? [
                  {
                    desc: 'fix this badboy',
                    fix: function(fixer) {
                      const sourceCode = context.getSourceCode();

                      const tagName = getOpeningElement(
                        style.node
                      ).toLowerCase();
                      const styleName = `${tagName}Style`;

                      const styleSheetDeclration =
                        '\n\n' +
                        'const styles = StyleSheet.create({\n' +
                        `  ${styleName}:${expression},\n` +
                        '});';

                      const lastNode =
                        sourceCode.ast.body[sourceCode.ast.body.length - 1];

                      return [
                        fixer.replaceTextRange(
                          style.node.range,
                          `styles.${styleName}`
                        ),
                        fixer.insertTextAfterRange(
                          lastNode.range,
                          styleSheetDeclration
                        ),
                      ];
                    },
                  },
                ]
              : [],
          });
        }
      });
    }
  }

  return {
    JSXAttribute: (node) => {
      if (astHelpers.isStyleAttribute(node)) {
        const styles = astHelpers.collectStyleObjectExpressions(
          node.value,
          context
        );
        styleSheets.addObjectExpressions(styles);
      }
    },

    'Program:exit': () =>
      reportInlineStyles(styleSheets.getObjectExpressions()),
  };
});

module.exports.schema = [];
