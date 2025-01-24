import path from "path";
import * as vscode from "vscode";
import { getParser, parserAndFlatAstNodes } from "./parser";

export class ASTWebviewManager {
    private static _extensionContext: vscode.ExtensionContext;
    private static _cache = new Map<string, vscode.WebviewPanel>();
    public static get extensionContext() {
        return this._extensionContext;
    }

    static initManager(extensionContext: vscode.ExtensionContext) {
        if (this._extensionContext) {
            console.error(`ASTWebviewManager has been initialized successfully.`)
            return;
        }
        this._extensionContext = extensionContext;
        // 注册一个web视图序列化器
        vscode.window.registerWebviewPanelSerializer(AstWebview.viewType, new AstWebviewSerializer());
    }

    /**
     * 创建一个语法树的web视图
     * @param doc vscode打开的文档
     */
    static async createAstWebview(doc: vscode.TextDocument) {
        let webview = this._cache.get(doc.uri.toString(true));
        if (webview) {
            this.reveal(doc, webview);
        }
        const astWebview = new AstWebview(doc);

        this._cache.set(doc.uri.toString(true), astWebview.webviewPanel);
    }

    /**
     * 恢复一个语法树web视图
     * @param webview 语法树web视图
     */
    static async reveal(doc:vscode.TextDocument, webview: vscode.WebviewPanel) {
        new AstWebview(doc, webview);
    }
}

export class AstWebviewSerializer implements vscode.WebviewPanelSerializer {
    async deserializeWebviewPanel(webviewPanel: vscode.WebviewPanel, state: any) {
        // `state` is the state persisted using `setState` inside the webview
        console.log(`Got state: ${state}`);
    
        // Restore the content of our webview.
        //
        // Make sure we hold on to the `webviewPanel` passed in here and
        // also restore any event listeners we need on it.
       // webviewPanel.webview.html = getWebviewContent();
       
       try{
        const doc = await vscode.workspace.openTextDocument(vscode.Uri.parse(state.docUri));
        ASTWebviewManager.reveal(doc, webviewPanel)
       }catch(error){
        console.error(error)
       }
      }
}

/**
 * 语法树web视图类
 */
class AstWebview {
    public static readonly viewType = 'tree-sitter-viewer.ast-webview';
    // 打开的代码文档
    private readonly doc: vscode.TextDocument;
    readonly webviewPanel: vscode.WebviewPanel;

    // 构造函数
    constructor(doc: vscode.TextDocument, webviewPanel?:vscode.WebviewPanel) {
        this.doc = doc;
        if(webviewPanel){
            this.webviewPanel = webviewPanel;
        }else{
            const viewTitle = `Ast - ${path.basename(doc.fileName)}`;
            this.webviewPanel = vscode.window.createWebviewPanel(AstWebview.viewType, viewTitle, vscode.ViewColumn.Beside, { enableFindWidget: true, });
            this.webviewPanel.webview.options = { enableScripts: true };
        }
        this.webviewPanel.webview.html = this.getHtml();
        this.refresh();
    }

    private asWebviewUri(...paths: string[]) {
        const path = vscode.Uri.joinPath(ASTWebviewManager.extensionContext.extensionUri, "resources", ...paths);
        return this.webviewPanel.webview.asWebviewUri(path)
    }

    private async refresh() {
        const text = this.doc.getText();
        const nodes = await parserAndFlatAstNodes(text, this.doc.languageId);
        this.webviewPanel.webview.postMessage({
            command: 'update',
            docUri: this.doc.uri.toString(true),
            nodes: JSON.stringify(nodes)
        });
    }

    private getHtml() {
        const styleVSCodeUri = this.asWebviewUri("css", 'vscode.css');
        const astEditorUri = this.asWebviewUri("css", 'astEditor.css');
        const scriptUri = this.asWebviewUri("js", "astView.js");
        const cspSource = this.webviewPanel.webview.cspSource;
        const nonce = getNonce();
        return /* html */ `
        <!DOCTYPE html>
        <html lang="en">
            <head>
                <meta charset="UTF-8" />
                <!-- 使用内容安全策略限制资源加载 -->
                <meta
                    http-equiv="Content-Security-Policy"
                    content="default-src 'none'; img-src ${cspSource}; style-src ${cspSource}; script-src 'nonce-${nonce}';"/>
                <meta name="viewport" content="width=device-width, initial-scale=1.0" />
                <title>Syntax Tree</title>
                <link href="${styleVSCodeUri}" rel="stylesheet" />
                <link href="${astEditorUri}" rel="stylesheet" />
            </head>
            <body>
                <div class="tool-container">
                    <div class="tool-item">
                        <input type="checkbox" id="show-anonymous-checkbox" ></input>
                        <label for="show-anonymous-checkbox">显示匿名节点</label>
                    </div>
                    <div class="tool-item">
                        <input type="checkbox" id="enabled-query-checkbox" ></input>
                        <label for="enabled-query-checkbox">启用查询</label>
                    </div><br>
                </div>
                <div class="query-container" id="query-container">
                    <label>查询语句：</label>
                    <textarea id="query-input"></textarea>
                </div>
                <div class="split-line"><div>Tree: </div><hr /></div>
                <div id="output-container-scroll">
                    <div class="tree-container">
                        <div class="row-number-container" id="row-number-container"></div>
                        <div id="output-container" class="highlight" tabindex="0" style="counter-increment: clusterize-counter -1">
                        </div>
                    </div>
                </div>
            </body>
            <script nonce="${nonce}" src="${scriptUri}"></script>
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