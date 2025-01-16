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
		edit.replace(
			document.uri,
			new vscode.Range(0, 0, document.lineCount, 0),
			document.getText()
		);

		return vscode.workspace.applyEdit(edit);
	}

    private getHtml(webview: vscode.Webview) {
        const scriptUri = webview.asWebviewUri(
            vscode.Uri.joinPath(this.context.extensionUri, "resources", "js", "astEditor.js")
        );
        // 使用nonce来限制可运行的脚本
        const nonce = getNonce();
        return /* html */ `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">

            <!-- 使用内容安全策略限制资源加载 -->
            <meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src ${webview.cspSource}; style-src ${webview.cspSource}; script-src 'nonce-${nonce}';"> 
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Syntax Tree</title>
        </head>
        <body>
            <div class="notes">
                <div class="add-button">
                    <button>Scratch!</button>
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
