const path = require('path');
const webpack = require('webpack');

module.exports = {
	mode: 'development',
	devServer: {
		static: 'dist',
		open: true
	},
	devtool: 'eval-source-map',
	entry: [
		'./src/index.js',
	],
	output: {
		path: path.resolve(__dirname, 'dist'),
		filename: 'bundle.js',
	},
	plugins: [
		new webpack.ProvidePlugin({
			$: 'jquery',
			jQuery: 'jquery',
		})
	],
	module: {
		rules: [
			{
				test: /\.css$/,
				use: [
					'style-loader',
					'css-loader'
				]
			}
		]
	}
}
