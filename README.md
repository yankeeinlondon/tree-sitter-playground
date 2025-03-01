# tree-sitter-viewer 

这是一个类似于 `Tree-sitter` 官网[`游乐场`](https://tree-sitter.github.io/tree-sitter/7-playground.html)的`VS Code`扩展插件。  
您可以使用该插件方便的查看不同开发语言的抽象语法树。  
以下是目前支持查看语法树的语言列表：  
- Bash
- C
- C++
- C#
- CSS
- Go
- Haskell
- HTML
- Java
- JavaScript
- JSON
- PHP
- Python
- Regex
- Ruby
- Rust
- Scala
- TypeScript

## 功能演示

![功能演示](https://raw.githubusercontent.com/xiaonatuo/tree-sitter-viewer/refs/heads/master/resources/demo.gif)

## 已知问题

https://github.com/xiaonatuo/tree-sitter-viewer/issues

## 版本发布

### 1.0.0
初始版本发布。

### 1.0.1
- 优化查看语法树功能仅在文本编辑器中可见
- 添加树形图标资源，更新 package.json 中的图标配置，删除旧图标文件

### 1.0.2
- 修复在编辑代码后语法树渲染错误的问题

### 1.0.3
- 增加在关闭语法树webview时移除对编辑器中代码的样式修饰

### 1.0.4
- 修复在下载wasm文件失败时不显示通知的问题
- 优化获取相关语言wasm文件的逻辑
- 将主流开发语言的wasm文件预置到插件中
- 在编译打包时，使用cpy替换cpx进行wasm文件的拷贝

### 1.0.5
- 增加语法树查询功能
- 调整在不勾选映射节点的情况下，点击代码编辑器时语法树视图自动跳转对应语法节点位置

### 1.0.6
- 修复语法树查询结果在页面渲染不全的bug
- 优化资源管理器中右键查看语法树菜单的显示时机
- 调整捕获名称渲染颜色的优先级
- 优化Ast视图页面样式

## 更多信息

* [Github](https://github.com/xiaonatuo/tree-sitter-viewer)

**Enjoy!**
