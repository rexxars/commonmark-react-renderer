# commonmark-react-renderer

[![npm version](http://img.shields.io/npm/v/commonmark-react-renderer.svg?style=flat-square)](http://browsenpm.org/package/commonmark-react-renderer)[![Build Status](http://img.shields.io/travis/rexxars/commonmark-react-renderer/master.svg?style=flat-square)](https://travis-ci.org/rexxars/commonmark-react-renderer)[![Coverage Status](http://img.shields.io/codeclimate/coverage/github/rexxars/commonmark-react-renderer.svg?style=flat-square)](https://codeclimate.com/github/rexxars/commonmark-react-renderer)[![Code Climate](http://img.shields.io/codeclimate/github/rexxars/commonmark-react-renderer.svg?style=flat-square)](https://codeclimate.com/github/rexxars/commonmark-react-renderer/)

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
* `escapeHtml` - *boolean* Setting to `true` will escape HTML blocks, rendering plain text instead of inserting the blocks as raw HTML (default: `false`).
* `skipHtml` - *boolean* Setting to `true` will skip inlined and blocks of HTML (default: `false`).
* `softBreak` - *string* Setting to `br` will create `<br>` tags instead of newlines (default: `\n`).
* `allowedTypes` - *array* Defines which types of nodes should be allowed (rendered). (default: all types).
* `disallowedTypes` - *array* Defines which types of nodes should be disallowed (not rendered). (default: none).

## Testing

```bash
git clone git@github.com:rexxars/commonmark-react-renderer.git
cd commonmark-react-renderer
npm install
npm test
```

## License

MIT-licensed. See LICENSE.
