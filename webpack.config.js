//@ts-check
'use strict';

const path = require('path');

//@ts-check
/** @typedef {import('webpack').Configuration} WebpackConfig **/

/** @type WebpackConfig */
const extensionConfig = {
  target: 'node', // VS Code 扩展运行在 Node.js 环境中
  mode: 'none', // 打包模式为 none，保持源代码尽可能接近原始状态（打包时设置为 'production'）

  entry: './src/extension.ts', // 扩展的入口文件
  output: {
    // 打包后的文件存储在 'dist' 目录下
    path: path.resolve(__dirname, 'dist'),
    filename: 'extension.js', // 输出文件名
    libraryTarget: 'commonjs2' // 模块输出格式为 CommonJS2
  },
  externals: {
    vscode: 'commonjs vscode' // vscode 模块是动态创建的，必须排除。其他无法 webpack 打包的模块也需要在此添加
    // 在此添加的模块也需要在 .vscodeignore 文件中添加
  },
  resolve: {
    // 支持读取 TypeScript 和 JavaScript 文件
    extensions: ['.ts', '.js']
  },
  module: {
    rules: [
      {
        test: /\.ts$/, // 匹配所有 .ts 文件
        exclude: /node_modules/, // 排除 node_modules 目录
        use: [
          {
            loader: 'ts-loader' // 使用 ts-loader 处理 TypeScript 文件
          }
        ]
      }
    ]
  },
  devtool: 'nosources-source-map', // 使用 nosources-source-map 生成 source map
  infrastructureLogging: {
    level: "log", // 启用日志记录，用于问题匹配器
  },
};
module.exports = [ extensionConfig ]; // 导出配置