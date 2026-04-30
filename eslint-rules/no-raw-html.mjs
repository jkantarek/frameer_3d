// Custom ESLint rule: ban raw DOM manipulation in production source.
//
// Rationale: all UI in this project is built with Tweakpane. Direct calls to
// document.createElement / innerHTML / appendChild produce elements that fall
// outside Tweakpane's lifecycle and styling.
//
// Exceptions allowed in this codebase:
//   - The #elements-panel wrapper <div> in ElementPanel.ts (Tweakpane Pane mount point)
//   - Test files (*.test.ts / *.spec.ts) need raw DOM nodes as test fixtures
//
// If you are building new UI and hit this rule, use Tweakpane instead:
//   Context7 library ID: /cocopon/tweakpane
//   Query docs with: mcp_context7_query-docs { libraryId: '/cocopon/tweakpane', query: '...' }

const BANNED_METHODS = new Set(['createElement', 'appendChild', 'insertBefore', 'replaceChild']);
const BANNED_PROPS = new Set(['innerHTML', 'outerHTML']);

const DOCS_HINT =
  'Use Tweakpane instead. Docs: Context7 libraryId "/cocopon/tweakpane" — ' +
  'query with mcp_context7_query-docs.';

export default {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow raw DOM manipulation (createElement, innerHTML, appendChild, etc.) ' +
        'in production source. Use Tweakpane for all UI. ' + DOCS_HINT,
    },
    schema: [],
    messages: {
      noRawHtml:
        'Raw DOM "{{name}}" is not allowed in production source. ' + DOCS_HINT,
    },
  },

  create(context) {
    return {
      // document.createElement('div'), el.appendChild(child)
      CallExpression(node) {
        const callee = node.callee;
        if (callee.type !== 'MemberExpression') return;
        const prop = callee.property;
        if (prop.type !== 'Identifier') return;
        if (!BANNED_METHODS.has(prop.name)) return;
        context.report({ node, messageId: 'noRawHtml', data: { name: prop.name } });
      },

      // el.innerHTML = '...', el.outerHTML = '...'
      AssignmentExpression(node) {
        const left = node.left;
        if (left.type !== 'MemberExpression') return;
        const prop = left.property;
        if (prop.type !== 'Identifier') return;
        if (!BANNED_PROPS.has(prop.name)) return;
        context.report({ node, messageId: 'noRawHtml', data: { name: prop.name } });
      },
    };
  },
};
