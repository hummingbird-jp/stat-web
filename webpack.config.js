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
				test: /\.(ogg|mp3|wav|mpe?g)$/i,
				loader: 'file-loader',
				options: {
					name: '[path][name].[ext]'
				}
			},
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
