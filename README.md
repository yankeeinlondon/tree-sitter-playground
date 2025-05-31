# tree-sitter-playground

> A shameless fork of [xiaonatuo](https://github.com/xiaonatuo)'s `tree-sitter-viewer`
> which was translated to English so that I can understand what I'm looking at 😆

A `tree-sitter` Playground plugin for **VSCode**.

Use this extension to easily view the abstract syntax tree of different development languages.

The following is a list of languages ​​that currently support viewing syntax trees:

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

## Demo

![Demo](https://raw.githubusercontent.com/xiaonatuo/tree-sitter-viewer/refs/heads/master/resources/demo.gif)

## Known Issues

- [Issue](https://github.com/xiaonatuo/tree-sitter-viewer/issues)

## Change Log

### 1.0.0

- initial version released

### 1.0.1

- Optimized syntax tree viewing function is only visible in text editor
- Add tree icon resources, update icon configuration in package.json, and delete old icon files

### 1.0.2

- Fixed the issue with syntax tree rendering errors after editing code

### 1.0.3

- Added the ability to remove style modifications to the code in the editor when closing the syntax tree webview

### 1.0.4

- Fixed the issue where no notification was displayed when downloading wasm files failed
- Optimize the logic of obtaining related language wasm files
- Preset wasm files of mainstream development languages ​​into plugins
- When compiling and packaging, use `cpy` to replace `cpx` to copy the wasm file

### 1.0.5

- Add syntax tree query function
- Adjust the syntax tree view to automatically jump to the corresponding syntax node position when clicking the code editor without checking the mapping node

### 1.0.6

- Fixed the bug that the syntax tree query results were not fully rendered on the page
- Optimize the display timing of the syntax tree menu when right-clicking in the resource manager
- Adjust the priority of capture name rendering color
- Optimize Ast view page style

## More Information

- [Github](https://github.com/yankeeinlondon/tree-sitter-viewer)
- _forked from_ [tree-sitter-viewer](https://github.com/xiaonatuo/tree-sitter-viewer)
