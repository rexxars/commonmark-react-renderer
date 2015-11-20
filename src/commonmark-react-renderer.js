'use strict';

var React = require('react');

function tag(node, name, attrs, children) {
    node.react = {
        tag: name,
        props: attrs,
        children: children || []
    };
}

function isGrandParentOfList(node) {
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
    var softBreak = (
        this.softBreak === 'br' ?
        React.createElement('br') :
        this.softBreak
    );

    var e, node, entering, leaving, attrs, doc;
    while ((e = walker.next())) {
        entering = e.entering;
        leaving = !entering;
        node = e.node;
        attrs = {};

        if (!doc) {
            doc = node;
            node.react = { children: [] };
        }

        if (sourcePos && node.sourcepos) {
            var pos = node.sourcepos;
            attrs['data-sourcepos'] = [
                pos[0][0], ':', pos[0][1], '-',
                pos[1][0], ':', pos[1][1]
            ].map(String).join('');
        }

        if (node.type === 'Paragraph' && isGrandParentOfList(node)) {
            continue;
        }

        if (leaving) {
            if (node.type === 'Image') {
                node.react.props.alt = node.react.children[0];
                node.react.children = [];
            }

            if (node !== doc) {
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
    return {
        sourcePos: opts.sourcePos,
        softBreak: opts.softBreak || '\n',
        escapeHtml: Boolean(opts.escapeHtml),
        skipHtml: Boolean(opts.skipHtml),
        render: renderNodes
    };
}

module.exports = ReactRenderer;
