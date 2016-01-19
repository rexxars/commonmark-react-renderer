'use strict';

var React = require('react');

var allTypes = [
    'Html', 'HtmlBlock', 'Text', 'Paragraph', 'Header', 'Softbreak', 'Hardbreak',
    'Link', 'Image', 'Emph', 'Code', 'CodeBlock', 'BlockQuote', 'List', 'Item',
    'Strong', 'HorizontalRule', 'Document'
];

function tag(node, name, attrs, children) {
    node.react = {
        tag: name,
        props: attrs,
        children: children || []
    };
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

function createElement(tagName, props, children) {
    var args = [tagName, props].concat(children);
    var child = React.createElement.apply(React, args);
    return child;
}

function renderNodes(block) {
    var walker = block.walker();
    var sourcePos = this.sourcePos;
    var escapeHtml = this.escapeHtml;
    var skipHtml = this.skipHtml;
    var infoWords;

    // Softbreaks are usually treated as newlines, but in HTML we might want explicit linebreaks
    var softBreak = (
        this.softBreak === 'br' ?
        React.createElement('br') :
        this.softBreak
    );

    var e, node, entering, leaving, attrs, doc, key;
    while ((e = walker.next())) {
        entering = e.entering;
        leaving = !entering;
        node = e.node;
        key = !e.node.prev ? 0 : e.node.prev.reactKey + 1;
        attrs = { key: key };

        // Assigning a key to the node
        node.reactKey = key;

        // If we have not assigned a document yet, assume the current node is just that
        if (!doc) {
            doc = node;
            node.react = { children: [] };
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
        if (node.type === 'Paragraph' && isGrandChildOfList(node)) {
            continue;
        }

        if (leaving) {
            // Commonmark treats image description as children. We just want the text
            if (node.type === 'Image') {
                node.react.props.alt = node.react.children[0];
                node.react.children = [];
            }

            // `allowNode` is validated to be a function if it exists
            if (node !== doc && this.allowNode && !this.allowNode({
                type: node.type,
                tag: node.react.tag,
                props: node.react.props,
                children: node.react.children
            })) {
                continue;
            }

            // `allowedTypes` is an array containing the allowed types
            var nodeIsAllowed = this.allowedTypes.indexOf(node.type) !== -1;
            if (node !== doc && nodeIsAllowed) {
                addChild(node, createElement(
                    node.react.tag,
                    node.react.props,
                    node.react.children
                ));
            }

            continue;
        }

        // Entering a new node
        switch (node.type) {
            case 'Html':
            case 'HtmlBlock':
                if (escapeHtml) {
                    addChild(node, node.literal);
                } else if (!skipHtml) {
                    attrs.dangerouslySetInnerHTML = {
                        __html: node.literal
                    };

                    addChild(node, createElement(
                        node.type === 'Html' ? 'span' : 'div',
                        attrs
                    ));
                }
                break;
            case 'Text':
                addChild(node, node.literal);
                break;
            case 'Paragraph':
                tag(node, 'p', attrs);
                break;
            case 'Header':
                tag(node, 'h' + node.level, attrs);
                break;
            case 'Softbreak':
                addChild(node, softBreak);
                break;
            case 'Hardbreak':
                addChild(node, React.createElement('br'));
                break;
            case 'Strong':
                tag(node, 'strong', attrs);
                break;
            case 'Link':
                attrs.href = node.destination;
                if (node.title) {
                    attrs.title = node.title;
                }
                tag(node, 'a', attrs);
                break;
            case 'Image':
                attrs.src = node.destination;
                if (node.title) {
                    attrs.title = node.title;
                }
                tag(node, 'img', attrs);
                break;
            case 'Emph':
                tag(node, 'em', attrs);
                break;
            case 'Code':
                addChild(node, createElement(
                    'code',
                    attrs,
                    [node.literal]
                ));
                break;
            case 'CodeBlock':
                infoWords = node.info ? node.info.split(/ +/) : [];
                if (infoWords.length > 0 && infoWords[0].length > 0) {
                    attrs.className = 'language-' + infoWords[0];
                }

                var code = createElement('code', attrs, [node.literal]);
                addChild(node, createElement('pre', {}, [code]));
                break;
            case 'BlockQuote':
                tag(node, 'blockquote', attrs);
                break;
            case 'List':
                var start = node.listStart;
                if (start !== null && start !== 1) {
                    attrs.start = start.toString();
                }
                tag(node, node.listType === 'Bullet' ? 'ul' : 'ol', attrs);
                break;
            case 'Item':
                tag(node, 'li', attrs);
                break;
            case 'HorizontalRule':
                addChild(node, createElement('hr', attrs));
                break;
            case 'Document':
                break;
            default:
                throw new Error('Unknown node type "' + node.type + '"');
        }
    }

    return doc.react.children;
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

    var allowedTypes = opts.allowedTypes || allTypes;
    if (opts.disallowedTypes) {
        allowedTypes = allowedTypes.filter(function(type) {
            return opts.disallowedTypes.indexOf(type) === -1;
        });
    }

    return {
        sourcePos: opts.sourcePos,
        softBreak: opts.softBreak || '\n',
        escapeHtml: Boolean(opts.escapeHtml),
        skipHtml: Boolean(opts.skipHtml),
        allowNode: opts.allowNode,
        allowedTypes: allowedTypes,
        render: renderNodes
    };
}

module.exports = ReactRenderer;
