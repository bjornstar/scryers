const HtmlWebpackPlugin = require('html-webpack-plugin');
const path = require('path');
const { SourceMapDevToolPlugin } = require('webpack');

const webpackOptions = {
	context: path.resolve(__dirname, 'client'),
	entry: {
		index: './index.js'
	},
	mode: 'none',
	module: {
		rules: [
			{
				loader: 'file-loader',
				options: {
          name: '[path][name].[ext]'
        },
				test: /\.(css|html|png)$/
			},
		]
	},
	plugins: [
		new HtmlWebpackPlugin({
			filename: './index.html',
			template: './index.ejs'
		}),
		new SourceMapDevToolPlugin({})
	]
};

module.exports = webpackOptions;
