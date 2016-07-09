'use strict';

var React = require('react'),
    renderHtml = require('react-dom/server'),
    commonmark = require('commonmark'),
    expect = require('chai').expect,
    ReactRenderer = require('../');

var parser = new commonmark.Parser(),
    reactRenderer = new ReactRenderer();

var xssInput = [
    '# [Much fun](javascript:alert("foo"))',
    'Can be had with [XSS links](vbscript:foobar)',
    '> And [other](VBSCRIPT:bap) nonsense... [files](file:///etc/passwd) for instance',
    '## [Entities](javascript&#x3A;alert("bazinga")) can be tricky, too'
].join('\n\n');

var CodeBlockComponent = React.createClass({
    displayName: 'CodeBlock',
    render: function() {
        return React.createElement('pre', null, JSON.stringify(this.props));
    }
});

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

    it('should handle images with title tags', function() {
        var input = 'This is ![an image](/ninja.png "foo bar").';
        var expected = '<p>This is <img src="/ninja.png" title="foo bar" alt="an image"/>.</p>';
        expect(parse(input)).to.equal(expected);
    });

    it('should handle images without special characters in alternative text', function() {
        var input = 'This is ![a ninja\'s image](/ninja.png).';
        var expected = '<p>This is <img src="/ninja.png" alt="a ninja&#x27;s image"/>.</p>';
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
        var expected = '<p>I am having <span>&lt;strong&gt;</span>so<span>&lt;/strong&gt;</span> much fun</p>';
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
            '<p>This is a regular paragraph.</p><div>&lt;table&gt;\n    ',
            '&lt;tr&gt;\n        &lt;td&gt;Foo&lt;/td&gt;\n    &lt;/tr&gt;\n',
            '&lt;/table&gt;</div><p>This is another regular paragraph.</p>'
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
        var renderer = new ReactRenderer({ allowedTypes: ['FakeType'] });
        expect(function() {
            renderer.render({ walker: getFakeWalker });
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

    it('should unwrap child nodes from disallowed nodes, if unwrapDisallowed option is enabled', function() {
        var input = 'Espen *initiated* this, but has had several **contributors**';
        var expected = '<p>Espen initiated this, but has had several contributors</p>';
        var expectedRaw = '<p>Espen <em>initiated</em> this, but has had several <strong>contributors</strong></p>';
        var expectedSkip = '<p>Espen  this, but has had several </p>';

        expect(parse(input, { disallowedTypes: ['Emph', 'Strong'], unwrapDisallowed: true })).to.equal(expected);
        expect(parse(input, { disallowedTypes: ['Emph', 'Strong'] })).to.equal(expectedSkip);
        expect(parse(input, {})).to.equal(expectedRaw);
    });

    describe('should skip nodes that are defined as disallowed', function() {
        var samples = {
            HtmlInline: { input: 'Foo<strong>bar</strong>', shouldNotContain: 'Foo<span><strong>' },
            HtmlBlock: { input: '<pre>\n<code>var foo = "bar";\n</code>\n</pre>\nYup', shouldNotContain: 'var foo' },
            Text: { input: 'Zing', shouldNotContain: 'Zing' },
            Paragraph: { input: 'Paragraphs are cool', shouldNotContain: 'Paragraphs are cool' },
            Heading: { input: '# Headers are neat', shouldNotContain: 'Headers are neat' },
            Softbreak: { input: 'Text\nSoftbreak', shouldNotContain: 'Text\nSoftbreak' },
            Hardbreak: { input: 'Text  \nHardbreak', shouldNotContain: '<br/>' },
            Link: { input: '[Espen\'s blog](http://espen.codes/) yeh?', shouldNotContain: '<a' },
            Image: { input: 'Holy ![ninja](/ninja.png), batman', shouldNotContain: '<img' },
            Emph: { input: 'Many *contributors*', shouldNotContain: '<em' },
            Code: { input: 'Yeah, `renderToStaticMarkup()`', shouldNotContain: 'renderToStaticMarkup' },
            CodeBlock: { input: '```\nvar moo = require(\'bar\');\moo();\n```', shouldNotContain: '<pre><code>' },
            BlockQuote: { input: '> Moo\n> Tools\n> FTW\n', shouldNotContain: '<blockquote' },
            List: { input: '* A list\n*Of things', shouldNotContain: 'Of things' },
            Item: { input: '* IPA\n*Imperial Stout\n', shouldNotContain: '<li' },
            Strong: { input: 'Don\'t **give up**, alright?', shouldNotContain: 'give up' },
            ThematicBreak: { input: '\n-----\nAnd with that...', shouldNotContain: '<hr' }
        };

        var fullInput = Object.keys(samples).reduce(function(input, sampleType) {
            return input + samples[sampleType].input + '\n';
        }, '');

        Object.keys(samples).forEach(function(type) {
            it(type, function() {
                var sample = samples[type];

                expect(parse(fullInput, { disallowedTypes: [type] })).to.not.contain(sample.shouldNotContain);

                // Just for sanity's sake, let ensure that the opposite is true
                expect(parse(fullInput, {})).to.contain(sample.shouldNotContain);
            });
        });
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

    it('should throw if `renderers` is not an object', function() {
        expect(function() {
            parse('', { renderers: [] });
        }).to.throw(Error, /renderers.*?object/i);

        expect(function() {
            parse('', { renderers: 'foo' });
        }).to.throw(Error, /renderers.*?object/i);
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

    it('should be possible to override renderers used for given types', function() {
        var input = '# Header\n---\nParagraph a day...\n```js\nvar keepTheDoctor = "away";\n```\n> Foo';
        expect(parse(input, {
            renderers: {
                Heading: function(props) {
                    return React.createElement('div', {className: 'level-' + props.level}, props.children);
                },
                CodeBlock: CodeBlockComponent
            }
        }).replace(/&quot;/g, '"')).to.equal([
            '<div class="level-1">Header</div><hr/><p>Paragraph a day...</p>',
            '<pre>{"language":"js","literal":"var keepTheDoctor = \\"away\\";\\n","nodeKey":3}</pre>',
            '<blockquote><p>Foo</p></blockquote>'
        ].join(''));
    });

    it('should be possible to "unset" renderers by passing null-values for given types', function() {
        var input = '# Header\n---\nParagraph a day...\n```js\nvar keepTheDoctor = "away";\n```';

        expect(function() {
            parse(input, { renderers: { Heading: null } });
        }).to.throw(Error, /Heading/);
    });

    it('does not allow javascript, vbscript or file protocols by default', function() {
        expect(parse(xssInput)).to.equal([
            '<h1><a href="x-javascript:alert(%22foo%22)">Much fun</a></h1><p>Can be had with ',
            '<a href="x-vbscript:foobar">XSS links</a></p><blockquote><p>',
            'And <a href="x-VBSCRIPT:bap">other</a> nonsense... ',
            '<a href="x-file:///etc/passwd">files</a> for instance</p></blockquote><h2>',
            '<a href="x-javascript:alert(%22bazinga%22)">Entities</a> can be tricky, too</h2>'
        ].join(''));
    });

    it('allows disabling built-in uri filter', function() {
        var output = parse(xssInput, { transformLinkUri: null });

        expect(output).to.equal([
            '<h1><a href="javascript:alert(%22foo%22)">Much fun</a></h1><p>Can be had with ',
            '<a href="vbscript:foobar">XSS links</a></p><blockquote><p>',
            'And <a href="VBSCRIPT:bap">other</a> nonsense... ',
            '<a href="file:///etc/passwd">files</a> for instance</p></blockquote><h2>',
            '<a href="javascript:alert(%22bazinga%22)">Entities</a> can be tricky, too</h2>'
        ].join(''));
    });

    it('allows specifying a custom uri filter', function() {
        var output = parse('[foo](http://snails.r.us/pfft), also [bar](http://foo.bar/)', {
            transformLinkUri: function(uri) {
                return uri.replace(/snails/g, 'cheetahs');
            }
        });

        expect(output).to.equal(
            '<p><a href="http://cheetahs.r.us/pfft">foo</a>, also <a href="http://foo.bar/">bar</a></p>'
        );
    });

    it('exposes a list of available types on the `types`-property', function() {
        expect(ReactRenderer.types).to.be.an('array');
        expect(ReactRenderer.types).to.include('ThematicBreak');
    });

    it('exposes the default renders on the `renderers`-property', function() {
        expect(ReactRenderer.renderers.Image).to.be.a('string');
        expect(ReactRenderer.renderers.HtmlBlock).to.be.a('function');
    });

    it('exposes the default URI-transformer on the `uriTransformer`-property', function() {
        expect(ReactRenderer.uriTransformer).to.be.a('function');
        expect(ReactRenderer.uriTransformer('javascript:alert("foo")')) // eslint-disable-line no-script-url
            .to.equal('x-javascript:alert("foo")');
    });

    it('should reduce sibling text nodes into one text node', function() {
        var input = 'What does "this" thing turn into?';
        expect(parse(input).replace(/&quot;/g, '"')).to.equal('<p>What does "this" thing turn into?</p>');
    });

    describe('should only pass necessary props onto plain dom element renderers', function() {
        it('should pass only children onto blockquote', function() {
            expect(parse('> Foo\n> Bar\n> Baz\n')).to.contain('<blockquote><p>Foo');
        });

        it('should pass only children onto inline code', function() {
            expect(parse('`var foo = bar`')).to.contain('<code>var foo = bar</code>');
        });

        it('should pass children and className onto block code', function() {
            expect(parse('```js\nvar foo = "bar"\n```')).to.contain('<code class="language-js">');
        });

        it('should pass only children onto em', function() {
            expect(parse('react is _clever_, amirite?')).to.contain('<em>clever</em>');
        });

        it('should pass nothing onto a hardbreak', function() {
            expect(parse('React is cool  \nAnd so is markdown. Kinda.')).to.contain('<br/>');
        });

        it('should pass alt, title and src onto img', function() {
            var input = 'This is ![an image](/ninja.png "foo bar").';
            var expected = '<img src="/ninja.png" title="foo bar" alt="an image"/>';
            expect(parse(input)).to.contain(expected);
        });

        it('should pass no props onto list items', function() {
            expect(parse('* Foo\n* Bar\n')).to.contain('<ul><li>');
        });

        it('should pass no props onto list items', function() {
            expect(parse('* Foo\n* Bar\n')).to.contain('<ul><li>');
        });

        it('should pass children, href and title onto links', function() {
            var input = 'A [link](http://vaffel.ninja "Foo") to the Ninja.';
            expect(parse(input)).to.contain('<a href="http://vaffel.ninja" title="Foo">link</a>');
        });

        it('should pass only children onto paragraphs', function() {
            expect(parse('Foo bar')).to.contain('<p>');
        });

        it('should pass only children onto strong', function() {
            expect(parse('**React** strongly')).to.contain('<strong>React</strong>');
        });

        it('should pass no props onto horizontal rules', function() {
            expect(parse('# Foo\n---\nBar')).to.contain('<hr/>');
        });
    });
});

function getRenderer(opts) {
    if (opts) {
        return new ReactRenderer(opts);
    }

    return reactRenderer;
}

function getFakeWalker() {
    var numRuns = -1;
    return {
        next: function() {
            numRuns++;

            if (numRuns === 0) {
                return {
                    entering: true,
                    node: { type: 'document' }
                };
            } else if (numRuns === 1) {
                return {
                    entering: true,
                    node: { type: 'FakeType' }
                };
            }

            return null;
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
