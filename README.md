# commonmark-react-renderer

Renderer for CommonMark which returns an array of React elements, ready to be used in a React component. See [react-markdown](https://github.com/rexxars/react-markdown/) for such a component.

## Installing

```
npm install --save commonmark-react-renderer
```

## Basic usage

```js
var CommonMark = require('commonmark');
var ReactRenderer = require('commonmark-react-renderer');

var parser = new CommonMark.Parser();
var renderer = new ReactRenderer();

var input = '# This is a header\n\nAnd this is a paragraph';
var ast = parser.parse(input);
var result = renderer.render(ast);

// `result`:
[
    <h1>This is a header</h1>,
    <p>And this is a paragraph</p>
]
```

## Options

Pass an object of options to the renderer constructor to configure it. Available options:

* `sourcePos` - *boolean* Setting to `true` will add `data-sourcepos` attributes to all elements, indicating where in the markdown source they were rendered from (default: `false`).
* `escapeHtmlBlocks` - *boolean* Setting to `true` will escape HTML blocks, rendering plain text instead of inserting the blocks as raw HTML (default: `false`).
* `skipHtml` - *boolean* Setting to `true` will skip inlined and blocks of HTML (default: `false`).
* `softBreak` - *string* Setting to `br` will create `<br>` tags instead of newlines (default: `\n`).

## Testing

```bash
git clone git@github.com:rexxars/commonmark-react-renderer.git
cd commonmark-react-renderer
npm install
npm test
```

## License

MIT-licensed. See LICENSE.
