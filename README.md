# commonmark-react

React renderer for CommonMark (rationalized Markdown).

## Installing

```
npm install --save commonmark-react
```

## Basic usage

```js
var React = require('react');
var CommonmarkReact = require('commonmark-react');

React.render(
    <CommonmarkReact />,
    document.getElementById('container')
);
```

## Testing

```bash
git clone git@github.com:rexxars/commonmark-react.git && cd commonmark-react
npm install
npm test
```