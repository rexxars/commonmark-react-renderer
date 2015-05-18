'use strict';

var React = require('react');

var CommonmarkReact = React.createClass({
    displayName: 'CommonmarkReact',

    propTypes: {
        text: React.PropTypes.string.isRequired
    },

    render: function() {
        return <div>{this.props.text}</div>;
    }
});

module.exports = CommonmarkReact;
