const path = require('path');
const webpack = require('webpack');
const srcPath = './src/';

module.exports = {
	mode: 'development',
	devServer: {
		static: 'dist',
		open: true
	},
	devtool: 'eval-source-map',
	entry: [
		`${srcPath}agenda.js`,
		`${srcPath}agora.js`,
		`${srcPath}bgm.js`,
		`${srcPath}firebase.js`,
		`${srcPath}index.js`,
		`${srcPath}reaction.js`,
		`${srcPath}timer.js`,
		`${srcPath}user-info.js`,
		`${srcPath}voice-visualizer.js`,
		//`${srcPath}stylesheets/styles.css`,
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
