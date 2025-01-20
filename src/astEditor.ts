import * as vscode from "vscode";

export class AstEditorProvider implements vscode.CustomTextEditorProvider {
    // 抽象语法树编辑器的视图类型
    static readonly viewType = "tree-sitter-viewer.ast-editor";
    // 构造函数
    constructor(private readonly context: vscode.ExtensionContext) {}

    /**
     * 解决给定文本资源的自定义编辑器。
     * 当用户首次打开`CustomTextEditorProvider”的资源，或者使用此`CustomTextEditorProvider”重新打开现有编辑器时，将调用此函数。
     *
     * @param document 要解析的资源的文档。
     * @param webviewPanel 用于显示此资源的编辑器 UI 的 Web 视图面板。
     * 在解析过程中，提供者必须填写内容 Webview 面板的初始 html，并连接其上所有感兴趣的事件侦听器。提供者还可以保留`WebviewPanel`，以便以后在命令中使用。更多详情请参见 {@linkcode WebviewPanel}。
     * @param token 一个取消令牌，指示不再需要结果。
     * @returns Thenable 表示自定义编辑器已经解决。
     */
    resolveCustomTextEditor(
        document: vscode.TextDocument,
        webviewPanel: vscode.WebviewPanel,
        token: vscode.CancellationToken
    ): Thenable<void> | void {
        // 初始化编辑器的webview
        webviewPanel.webview.options = { enableScripts: true };
        webviewPanel.webview.html = this.getHtml(webviewPanel.webview); //TODO 要实现编辑器页面

        // 监听文档的修改事件
        const changeDispose = vscode.workspace.onDidChangeTextDocument((event) => {
            const doc = event.document;
            if (doc.uri.toString() === document.uri.toString()) {
                this.updateWebview(webviewPanel, doc);
            }
        });
        // 监听在vscode文本编辑器内的鼠标点击事件，并得到光标的位置
        vscode.window.onDidChangeTextEditorSelection((event) => {});

        // 当webview销毁时，停止对文档事件的监听
        webviewPanel.onDidDispose(() => changeDispose.dispose());
        // 更新webview的内容
        this.updateWebview(webviewPanel, document);
    }

    private updateWebview(webviewPanel: vscode.WebviewPanel, doc: vscode.TextDocument) {
        webviewPanel.webview.postMessage({
            type: "update",
            text: doc.getText(),
        });
        // this.updateTextDocument(doc);
    }
    /**
     * 将JSON写入给定文档
     */
    private updateTextDocument(document: vscode.TextDocument) {
        const edit = new vscode.WorkspaceEdit();

        // 每次替换整个文档
        edit.replace(document.uri, new vscode.Range(0, 0, document.lineCount, 0), document.getText());

        return vscode.workspace.applyEdit(edit);
    }

    private getHtml(webview: vscode.Webview) {
        
		const styleVSCodeUri = webview.asWebviewUri(
			vscode.Uri.joinPath(this.context.extensionUri, "resources", "css",  'vscode.css')
		);
		const astEditorUri = webview.asWebviewUri(
			vscode.Uri.joinPath(this.context.extensionUri, "resources", "css",  'astEditor.css')
		);
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.context.extensionUri, "resources", "js", "astEditor.js")
        );
        // 使用nonce来限制可运行的脚本
        const nonce = getNonce();
        return /* html */ `
        <!DOCTYPE html>
        <html lang="en">
            <head>
                <meta charset="UTF-8" />

                <!-- 使用内容安全策略限制资源加载 -->
                <meta
                    http-equiv="Content-Security-Policy"
                    content="default-src 'none'; img-src ${webview.cspSource}; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';"
                />
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <title>Syntax Tree</title>
                <link href="${styleVSCodeUri}" rel="stylesheet" />
                <link href="${astEditorUri}" rel="stylesheet" />
            </head>
            <body>
                <div class="notes">
                    <div class="add-button">
                        <button>Scratch!</button>
                    </div>
                </div>
                <div id="output-container-scroll">
                    <div id="output-container" class="highlight" tabindex="0" style="counter-increment: clusterize-counter -1">
                        <div class="row"><a class="node-link named" href="#" data-id="641944" data-range="0,0,2,0">translation_unit</a> <span class="position-info">[0, 0] - [2, 0]</span></div>
                        <ul class="tree-child">
                            <li class="tree-row">
                                <div class="row"><a class="node-link named" href="#" data-id="641848" data-range="0,0,0,10">declaration</a> <span class="position-info">[0, 0] - [0, 10]</span></div>
                                <ul class="tree-child">
                                    <li class="tree-row">
                                        <div class="row">type: <a class="node-link named" href="#" data-id="639432" data-range="0,0,0,3">type_identifier</a> <span class="position-info">[0, 0] - [0, 3]</span></div>
                                    </li>
                                </ul>
                            </li>
                            <li class="tree-row">
                                <div class="row">declarator: <a class="node-link named" href="#" data-id="640568" data-range="0,4,0,9">init_declarator</a> <span class="position-info">[0, 4] - [0, 9]</span></div>
                                <ul class="tree-child">
                                    <li class="tree-row">
                                        <div class="row">declarator: <a class="node-link named" href="#" data-id="639776" data-range="0,4,0,5">identifier</a> <span class="position-info">[0, 4] - [0, 5]</span></div>
                                    </li>
                                    <li class="tree-row">
                                        <div class="row"><a class="node-link anonymous" href="#" data-id="640464" data-range="0,6,0,7">=</a> <span class="position-info">[0, 6] - [0, 7]</span></div>
                                    </li>
                                    <li class="tree-row">
                                        <div class="row">value: <a class="node-link named" href="#" data-id="640200" data-range="0,8,0,9">number_literal</a> <span class="position-info">[0, 8] - [0, 9]</span></div>
                                    </li>
                                </ul>
                            </li>
                            <li class="tree-row">
                                <div class="row"><a class="node-link anonymous" href="#" data-id="640576" data-range="0,9,0,10">;</a> <span class="position-info">[0, 9] - [0, 10]</span></div>
                            </li>
                        </ul>
                        <ul class="tree-child">
                            <li class="tree-row">
                                <div class="row"><a class="node-link named" href="#" data-id="641856" data-range="1,0,1,16">expression_statement</a> <span class="position-info">[1, 0] - [1, 16]</span></div>
                                <ul class="tree-child">
                                    <li class="tree-row">
                                        <div class="row"><a class="node-link named" href="#" data-id="641664" data-range="1,0,1,15">call_expression</a> <span class="position-info">[1, 0] - [1, 15]</span></div>
                                        <ul class="tree-child">
                                            <li class="tree-row">
                                                <div class="row">function: <a class="node-link named" href="#" data-id="640944" data-range="1,0,1,11">field_expression</a> <span class="position-info">[1, 0] - [1, 11]</span></div>
                                                <ul class="tree-child">
                                                    <li class="tree-row">
                                                        <div class="row">argument: <a class="node-link named" href="#" data-id="640664" data-range="1,0,1,7">identifier</a> <span class="position-info">[1, 0] - [1, 7]</span></div>
                                                    </li>
                                                    <li class="tree-row">
                                                        <div class="row">operator: <a class="node-link anonymous" href="#" data-id="640848" data-range="1,7,1,8">.</a> <span class="position-info">[1, 7] - [1, 8]</span></div>
                                                    </li>
                                                    <li class="tree-row">
                                                        <div class="row">field: <a class="node-link named" href="#" data-id="640856" data-range="1,8,1,11">field_identifier</a> <span class="position-info">[1, 8] - [1, 11]</span></div>
                                                    </li>
                                                </ul>
                                            </li>
                                            <li class="tree-row">
                                                <div class="row">arguments: <a class="node-link named" href="#" data-id="641576" data-range="1,11,1,15">argument_list</a> <span class="position-info">[1, 11] - [1, 15]</span></div>
                                                <ul class="tree-child">
                                                    <li class="tree-row">
                                                        <div class="row"><a class="node-link anonymous" href="#" data-id="641296" data-range="1,11,1,12">(</a> <span class="position-info">[1, 11] - [1, 12]</span></div>
                                                    </li>
                                                    <li class="tree-row">
                                                        <div class="row"><a class="node-link named" href="#" data-id="641120" data-range="1,12,1,14">identifier</a> <span class="position-info">[1, 12] - [1, 14]</span></div>
                                                    </li>
                                                    <li class="tree-row">
                                                        <div class="row"><a class="node-link anonymous" href="#" data-id="641312" data-range="1,14,1,15">)</a> <span class="position-info">[1, 14] - [1, 15]</span></div>
                                                    </li>
                                                </ul>
                                            </li>
                                        </ul>
                                    </li>
                                </ul>
                            </li>
                            <li class="tree-row">
                                <div class="row"><a class="node-link anonymous" href="#" data-id="641760" data-range="1,15,1,16">;</a> <span class="position-info">[1, 15] - [1, 16]</span></div>
                            </li>
                        </ul>
                    </div>
                </div>
            </body>
        </html>

        `;
    }
}

function getNonce() {
    let text = "";
    const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
