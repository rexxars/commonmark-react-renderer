'use strict';

var React = require('react'),
    renderHtml = require('react-dom/server'),
    commonmark = require('commonmark'),
    expect = require('chai').expect,
    ReactRenderer = require('../');

var parser = new commonmark.Parser(),
    reactRenderer = new ReactRenderer();

describe('react-markdown', function() {
    it('should wrap single-line plain text in a paragraph', function() {
        var input = 'React is awesome';
        expect(parse(input)).to.equal('<p>React is awesome</p>');
    });

    it('should handle multiline paragraphs properly (softbreak/hardbreak)', function() {
        var input = 'React is awesome\nAnd so is markdown\n\nCombining = epic';
        var expected = '<p>React is awesome\nAnd so is markdown</p><p>Combining = epic</p>';
        expect(parse(input)).to.equal(expected);
    });

    it('should handle <br/> as softbreak', function() {
        var input = 'React is awesome\nAnd so is markdown\n\nCombining = epic';
        var expected = '<p>React is awesome<br/>And so is markdown</p><p>Combining = epic</p>';
        expect(parse(input, { softBreak: 'br' })).to.equal(expected);
    });

    it('should handle multi-space+break as hardbreak', function() {
        var input = 'React is awesome  \nAnd so is markdown';
        var expected = '<p>React is awesome<br/>And so is markdown</p>';
        expect(parse(input)).to.equal(expected);
    });

    it('should handle emphasis', function() {
        var input = 'React is _totally_ *awesome*';
        var expected = '<p>React is <em>totally</em> <em>awesome</em></p>';
        expect(parse(input)).to.equal(expected);
    });

    it('should handle bold/strong text', function() {
        var input = 'React is **totally** __awesome__';
        var expected = '<p>React is <strong>totally</strong> <strong>awesome</strong></p>';
        expect(parse(input)).to.equal(expected);
    });

    it('should handle links without title tags', function() {
        var input = 'This is [a link](http://vaffel.ninja/) to VaffelNinja.';
        var expected = '<p>This is <a href="http://vaffel.ninja/">a link</a> to VaffelNinja.</p>';
        expect(parse(input)).to.equal(expected);
    });

    it('should handle links with title tags', function() {
        var input = 'A [link](http://vaffel.ninja "Foo") to the Ninja.';
        var expected = '<p>A <a href="http://vaffel.ninja" title="Foo">link</a> to the Ninja.</p>';
        expect(parse(input)).to.equal(expected);
    });

    it('should handle images without title tags', function() {
        var input = 'This is ![an image](/ninja.png).';
        var expected = '<p>This is <img src="/ninja.png" alt="an image"/>.</p>';
        expect(parse(input)).to.equal(expected);
    });

    it('should handle images without title tags', function() {
        var input = 'This is ![an image](/ninja.png "foo bar").';
        var expected = '<p>This is <img src="/ninja.png" title="foo bar" alt="an image"/>.</p>';
        expect(parse(input)).to.equal(expected);
    });

    it('should be able to render headers', function() {
        expect(parse('# Awesome')).to.equal('<h1>Awesome</h1>');
        expect(parse('## Awesome')).to.equal('<h2>Awesome</h2>');
        expect(parse('### Awesome')).to.equal('<h3>Awesome</h3>');
        expect(parse('#### Awesome')).to.equal('<h4>Awesome</h4>');
        expect(parse('##### Awesome')).to.equal('<h5>Awesome</h5>');
    });

    it('should handle "inline" code', function() {
        var input = '`renderToStaticMarkup()`';
        var expected = '<p><code>renderToStaticMarkup()</code></p>';
        expect(parse(input)).to.equal(expected);
    });

    it('should handle code tags without any specifications', function() {
        var input = '```\nvar foo = require(\'bar\');\nfoo();\n```';
        var expected = '<pre><code>var foo = require(&#x27;bar&#x27;);\nfoo();\n</code></pre>';
        expect(parse(input)).to.equal(expected);
    });

    it('should handle code tags with language specification', function() {
        var input = '```js\nvar foo = require(\'bar\');\nfoo();\n```';
        var expected = [
            '<pre><code class="language-js">',
            'var foo = require(&#x27;bar&#x27;);\n',
            'foo();\n</code></pre>'
        ].join('');

        expect(parse(input)).to.equal(expected);
    });

    it('should handle code blocks by indentation', function() {
        var input = [
            '', '<footer class="footer">\n', '',
            '&copy; 2014 Foo Bar\n', '</footer>'
        ].join('    ');

        var expected = [
            '<pre><code>&lt;footer class=&quot;footer&quot;&gt;\n    ',
            '&amp;copy; 2014 Foo Bar\n&lt;/footer&gt;\n</code></pre>'
        ].join('');

        expect(parse(input)).to.equal(expected);
    });

    it('should handle blockquotes', function() {
        var input = '> Moo\n> Tools\n> FTW\n';
        var expected = '<blockquote><p>Moo\nTools\nFTW</p></blockquote>';
        expect(parse(input)).to.equal(expected);
    });

    it('should handle nested blockquotes', function() {
        var input = [
            '> > Lots of ex-Mootoolers on the React team\n>\n',
            '> Totally didn\'t know that.\n>\n',
            '> > There\'s a reason why it turned out so awesome\n>\n',
            '> Haha I guess you\'re right!'
        ].join('');

        var expected = [
            '<blockquote><blockquote><p>Lots of ex-Mootoolers on the React team</p></blockquote>',
            '<p>Totally didn&#x27;t know that.</p><blockquote><p>There&#x27;s a reason why it ',
            'turned out so awesome</p></blockquote><p>Haha I guess you&#x27;re right!',
            '</p></blockquote>'
        ].join('');

        expect(parse(input)).to.equal(expected);
    });

    it('should handle unordered lists', function() {
        var input = '* Unordered\n* Lists\n* Are cool\n';
        var expected = '<ul><li>Unordered</li><li>Lists</li><li>Are cool</li></ul>';
        expect(parse(input)).to.equal(expected);
    });

    it('should handle ordered lists', function() {
        var input = '1. Ordered\n2. Lists\n3. Are cool\n';
        var expected = '<ol><li>Ordered</li><li>Lists</li><li>Are cool</li></ol>';
        expect(parse(input)).to.equal(expected);
    });

    it('should handle ordered lists with a start index', function() {
        var input = '7. Ordered\n8. Lists\n9. Are cool\n';
        var expected = '<ol start="7"><li>Ordered</li><li>Lists</li><li>Are cool</li></ol>';
        expect(parse(input)).to.equal(expected);
    });

    it('should handle inline html', function() {
        var input = 'I am having <strong>so</strong> much fun';
        var expected = '<p>I am having <span><strong></span>so<span></strong></span> much fun</p>';
        expect(parse(input)).to.equal(expected);
    });

    it('should handle inline html with escapeHtml option enabled', function() {
        var input = 'I am having <strong>so</strong> much fun';
        var expected = '<p>I am having &lt;strong&gt;so&lt;/strong&gt; much fun</p>';
        expect(parse(input, { escapeHtml: true })).to.equal(expected);
    });

    it('should skip inline html when skipHtml option enabled', function() {
        var input = 'I am having <strong>so</strong> much fun';
        var expected = '<p>I am having so much fun</p>';
        expect(parse(input, { skipHtml: true })).to.equal(expected);
    });

    it('should handle html blocks', function() {
        var input = [
            'This is a regular paragraph.\n\n<table>\n    <tr>\n        ',
            '<td>Foo</td>\n    </tr>\n</table>\n\nThis is another',
            ' regular paragraph.'
        ].join('');

        var expected = [
            '<p>This is a regular paragraph.</p><div><table>\n    <tr>\n',
            '        <td>Foo</td>\n    </tr>\n</table></div><p>This is ',
            'another regular paragraph.</p>'
        ].join('');

        expect(parse(input)).to.equal(expected);
    });

    it('should handle html with escapeHtml option enabled', function() {
        var input = [
            'This is a regular paragraph.\n\n<table>\n    <tr>\n        ',
            '<td>Foo</td>\n    </tr>\n</table>\n\nThis is another ',
            'regular paragraph.'
        ].join('');

        var expected = [
            '<p>This is a regular paragraph.</p>&lt;table&gt;\n    ',
            '&lt;tr&gt;\n        &lt;td&gt;Foo&lt;/td&gt;\n    &lt;/tr&gt;\n',
            '&lt;/table&gt;<p>This is another regular paragraph.</p>'
        ].join('');

        expect(parse(input, { escapeHtml: true })).to.equal(expected);
    });

    it('should skip html blocks when skipHtml option enabled', function() {
        var input = [
            'This is a regular paragraph.\n\n<table>\n    <tr>\n        ',
            '<td>Foo</td>\n    </tr>\n</table>\n\nThis is another ',
            'regular paragraph.'
        ].join('');

        var expected = [
            '<p>This is a regular paragraph.</p>',
            '<p>This is another regular paragraph.</p>'
        ].join('');

        expect(parse(input, { skipHtml: true })).to.equal(expected);
    });

    it('should handle horizontal rules', function() {
        var input = 'Foo\n\n------------\n\nBar';
        var expected = '<p>Foo</p><hr/><p>Bar</p>';
        expect(parse(input)).to.equal(expected);
    });

    it('should throw on unknown node type', function() {
        expect(function() {
            reactRenderer.render({ walker: getFakeWalker });
        }).to.throw(Error, /FakeType/);
    });

    it('should set source position attrs if sourcePos option is set', function() {
        var input = 'Foo\n\n------------\n\nBar';
        var expected = [
            '<p data-sourcepos="1:1-1:3">Foo</p>',
            '<hr data-sourcepos="3:1-3:12"/>',
            '<p data-sourcepos="5:1-5:3">Bar</p>'
        ].join('');

        expect(parse(input, { sourcePos: true })).to.equal(expected);
    });

    it('should skip nodes that are not defined as allowed', function() {
        var input = '# Header\n\nParagraph\n## New header\n1. List item\n2. List item 2';
        var expected = [
            '<p>Paragraph</p>',
            '<ol>',
            '<li>List item</li>',
            '<li>List item 2</li>',
            '</ol>'
        ].join('');

        expect(parse(input, { allowedTypes: ['Text', 'Paragraph', 'List', 'Item'] })).to.equal(expected);
    });

    it('should skip nodes that are defined as disallowed', function() {
        var input = '# Header\n\nParagraph\n## New header\n1. List item\n2. List item 2\n\nFoo';
        var expected = [
            '<h1>Header</h1>',
            '<p>Paragraph</p>',
            '<h2>New header</h2>',
            '<p>Foo</p>'
        ].join('');

        expect(parse(input, { disallowedTypes: ['List'] })).to.equal(expected);
    });

    it('should throw if both allowed and disallowed types is specified', function() {
        expect(function() {
            parse('', { allowedTypes: ['foo'], disallowedTypes: ['bar'] });
        }).to.throw(Error, /Only one of/i);
    });

    it('should throw if `allowedTypes` is not an array', function() {
        expect(function() {
            parse('', { allowedTypes: 'foo' });
        }).to.throw(Error, /allowedTypes.*?array/i);
    });

    it('should throw if `disallowedTypes` is not an array', function() {
        expect(function() {
            parse('', { disallowedTypes: 'foo' });
        }).to.throw(Error, /disallowedTypes.*?array/i);
    });

    it('should throw if `allowNode` is not a function', function() {
        expect(function() {
            parse('', { allowNode: 'foo' });
        }).to.throw(Error, /allowNode.*?function/i);
    });

    it('should be able to use a custom function to determine if the node should be allowed', function() {
        var input = '# Header\n\n[react-markdown](https://github.com/rexxars/react-markdown/) is a nice helper\n\n';
        input += 'Also check out [my website](https://espen.codes/)';

        var output = parse(input, {
            allowNode: function(node) {
                return node.type !== 'Link' || node.props.href.indexOf('https://github.com/') === 0;
            }
        });

        expect(output).to.equal([
            '<h1>Header</h1><p><a href="https://github.com/rexxars/react-markdown/">react-markdown</a>',
            ' is a nice helper</p><p>Also check out </p>'
        ].join(''));
    });
});

function getRenderer(opts) {
    if (opts) {
        return new ReactRenderer(opts);
    }

    return reactRenderer;
}

function getFakeWalker() {
    var numRuns = 0;
    return {
        next: function() {
            if (numRuns++) {
                return null;
            }

            return {
                entering: true,
                node: { type: 'FakeType' }
            };
        }
    };
}

function parse(markdown, opts) {
    var ast = parser.parse(markdown);
    var result = getRenderer(opts).render(ast);

    var html = renderHtml.renderToStaticMarkup(
        React.createElement.apply(React, ['div', null].concat(result))
    );

    return html.substring('<div>'.length, html.length - '</div>'.length);
}
