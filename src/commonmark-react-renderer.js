'use strict';

var React = require('react');

function element(tagName, props, children) {
    var args = [tagName, props].concat([].concat(children));
    var child = React.createElement.apply(React, args);
    return child;
}

// NOTE: using objects as sets for O(1) lookups
function makeSet(array) {
    var set = {};

    array.forEach(function(item) {
        set[item] = true;
    });

    return set;
}

var deprecated = {
    Html: 'HtmlInline',
    Header: 'Heading',
    HorizontalRule: 'ThematicBreak'
};

// Defining the renderers
// Renderers are functions taking the following arguments:
//  - node: the commonmark node
//  - props: the set of props computed by the renderer
//  - children: children to append
//  - opts: miscellaneous options
var renderers = {
    HtmlInline: function(node, props, children, opts) {
        if (opts.escapeHtml) {
            return node.literal;
        } else if (!opts.skipHtml) {
            props.dangerouslySetInnerHTML = {
                __html: node.literal
            };

            var tagName = node.type === 'HtmlInline' ? 'span' : 'div';

            return element(tagName, props);
        }

        return null;
    },
    Text: function(node) {
        return node.literal;
    },
    Paragraph: function(node, props, children) {
        return element('p', props, children);
    },
    Heading: function(node, props, children) {
        return element('h' + node.level, props, children);
    },
    Softbreak: function(node, props, children, opts) {
        return (
            opts.softBreak === 'br' ?
            element('br') :
            opts.softBreak
        );
    },
    Hardbreak: function() {
        return element('br');
    },
    Strong: function(node, props, children) {
        return element('strong', props, children);
    },
    Link: function(node, props, children) {
        props.href = node.destination;
        if (node.title) {
            props.title = node.title;
        }

        return element('a', props, children);
    },
    Image: function(node, props, children) {
        props.src = node.destination;
        if (node.title) {
            props.title = node.title;
        }

        return element('img', props, children);
    },
    Emph: function(node, props, children) {
        return element('em', props, children);
    },
    Code: function(node, props, children) {
        return element('code', props, children);
    },
    CodeBlock: function(node, props, children) {
        var infoWords = node.info ? node.info.split(/ +/) : [];
        if (infoWords.length > 0 && infoWords[0].length > 0) {
            props.className = 'language-' + infoWords[0];
        }

        var code = element('code', props, children);
        return element('pre', null, code);
    },
    BlockQuote: function(node, props, children) {
        return element('blockquote', props, children);
    },
    List: function(node, props, children) {
        var start = node.listStart;
        if (start !== null && start !== 1) {
            props.start = start.toString();
        }

        var tagName = node.listType === 'Bullet' ? 'ul' : 'ol';
        return element(tagName, props, children);
    },
    Item: function(node, props, children) {
        return element('li', props, children);
    },
    ThematicBreak: function(node, props) {
        return element('hr', props);
    }
};

renderers.HtmlBlock = renderers.HtmlInline;

var allTypes = Object.keys(renderers);

var enteringTypes = [
    'Paragraph', 'Heading', 'Strong', 'Link', 'Image',
    'Emph', 'BlockQuote', 'List', 'Item'
];

var enteringTypesSet = makeSet(enteringTypes);

function tag(node, type, attrs) {
    node.react = {
        tag: type,
        props: attrs,
        children: []
    };

    if (type === 'Strong' || type === 'Emph') {
        node.react.children.push(node.literal);
    }
}

function isGrandChildOfList(node) {
    var grandparent = node.parent.parent;
    return (
        grandparent &&
        grandparent.type === 'List' &&
        grandparent.listTight
    );
}

function addChild(node, child) {
    var parent = node;
    do {
        parent = parent.parent;
    } while (!parent.react);

    parent.react.children.push(child);
}

function renderNodes(block) {
    var walker = block.walker();
    var sourcePos = this.sourcePos;

    var e, node, entering, leaving, type, render, attrs, doc, key;
    while ((e = walker.next())) {
        entering = e.entering;
        leaving = !entering;
        node = e.node;
        type = deprecated[node.type] || node.type;
        key = !node.prev ? 0 : node.prev.reactKey + 1;
        attrs = { key: key };

        // Assigning a key to the node
        node.reactKey = key;

        // If we have not assigned a document yet, assume the current node is just that
        if (!doc) {
            doc = node;
            node.react = { children: [] };
        }

        // Getting the correct renderer
        render = renderers[type];

        if (type !== 'Document') {
            if (!render) {
                throw new Error('Unknown node type "' + type + '"');
            }
            if (typeof render !== 'function') {
                throw new Error('Invalid renderer for type "' + type + '"');
            }
        } else {
            continue;
        }

        // `sourcePos` is true if the user wants source information (line/column info from markdown source)
        if (sourcePos && node.sourcepos) {
            var pos = node.sourcepos;
            attrs['data-sourcepos'] = [
                pos[0][0], ':', pos[0][1], '-',
                pos[1][0], ':', pos[1][1]
            ].map(String).join('');
        }

        // In HTML, we don't want paragraphs inside of list items
        if (type === 'Paragraph' && isGrandChildOfList(node)) {
            continue;
        }

        if (leaving) {
            // Commonmark treats image description as children. We just want the text
            if (type === 'Image') {
                node.react.props.alt = node.react.children[0];
                node.react.children = [];
            }

            // `allowNode` is validated to be a function if it exists
            if (node !== doc && this.allowNode && !this.allowNode({
                type: type,
                props: node.react.props,
                children: node.react.children
            })) {
                continue;
            }

            // `allowedTypesSet` is a set containing the allowed types
            var nodeIsAllowed = this.allowedTypesSet[type];
            if (node !== doc && nodeIsAllowed) {
                addChild(node, render(
                    node,
                    node.react.props,
                    node.react.children,
                    this
                ));
            }

            continue;
        }

        if (enteringTypesSet[type]) {
            tag(node, type, attrs);
        } else {
            addChild(node, render(
                node,
                attrs,
                [node.literal],
                this
            ));
        }
    }

    return doc.react.children;
}

function replaceDeprecatedType(type) {
    if (deprecated[type]) {
        return deprecated[type];
    }

    return type;
}

function ReactRenderer(options) {
    var opts = options || {};

    if (opts.allowedTypes && opts.disallowedTypes) {
        throw new Error('Only one of `allowedTypes` and `disallowedTypes` should be defined');
    }

    if (opts.allowedTypes && !Array.isArray(opts.allowedTypes)) {
        throw new Error('`allowedTypes` must be an array');
    }

    if (opts.disallowedTypes && !Array.isArray(opts.disallowedTypes)) {
        throw new Error('`disallowedTypes` must be an array');
    }

    if (opts.allowNode && typeof opts.allowNode !== 'function') {
        throw new Error('`allowNode` must be a function');
    }

    var allowedTypes = (opts.allowedTypes || allTypes).map(replaceDeprecatedType);
    if (opts.disallowedTypes) {
        var disallowed = opts.disallowedTypes.map(replaceDeprecatedType);
        allowedTypes = allowedTypes.filter(function(type) {
            return disallowed.indexOf(type) === -1;
        });
    }

    var allowedTypesSet = makeSet(allowedTypes);

    return {
        sourcePos: opts.sourcePos,
        softBreak: opts.softBreak || '\n',
        escapeHtml: Boolean(opts.escapeHtml),
        skipHtml: Boolean(opts.skipHtml),
        allowNode: opts.allowNode,
        allowedTypes: allowedTypes,
        allowedTypesSet: allowedTypesSet,
        render: renderNodes
    };
}

module.exports = ReactRenderer;
