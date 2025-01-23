import path from "path";
import * as vscode from "vscode";
import { getParser, parserMiniAst } from "./parser";

export class ASTWebviewManager {
    private static _extensionContext: vscode.ExtensionContext;
    private static _cache = new Map<vscode.Uri, AstWebview>();
    public static get extensionContext() {
        return this._extensionContext;
    }

    static initManager(extensionContext: vscode.ExtensionContext) {
        if (this._extensionContext) {
            console.error(`ASTWebviewManager has been initialized successfully.`)
            return;
        }
        this._extensionContext = extensionContext;
    }

    /**
     * 创建一个语法树的web视图
     * @param doc vscode打开的文档
     */
    static async createAstWebview(doc: vscode.TextDocument) {
        let webview = this._cache.get(doc.uri);
        if (webview) {
            this.reveal(webview);
        }
        webview = new AstWebview(doc);
        this._cache.set(doc.uri, webview);
    }

    /**
     * 恢复一个语法树web视图
     * @param webview 语法树web视图
     */
    static async reveal(webview: AstWebview) {

    }
}

/**
 * 语法树web视图类
 */
class AstWebview {
    public static readonly viewType = 'tree-sitter-viewer.ast-webview';
    // 打开的代码文档
    private readonly doc: vscode.TextDocument;
    private webviewPanel: vscode.WebviewPanel;

    // 构造函数
    constructor(doc: vscode.TextDocument) {
        this.doc = doc;

        const viewTitle = `Ast - ${path.basename(doc.fileName)}`;
        this.webviewPanel = vscode.window.createWebviewPanel(AstWebview.viewType, viewTitle, vscode.ViewColumn.Beside, { enableFindWidget: true, });
        this.webviewPanel.webview.options = { enableScripts: true };
        this.webviewPanel.webview.html = this.getHtml();
        this.refresh();
    }

    private asWebviewUri(...paths: string[]) {
        const path = vscode.Uri.joinPath(ASTWebviewManager.extensionContext.extensionUri, "resources", ...paths);
        return this.webviewPanel.webview.asWebviewUri(path)
    }

    private async refresh() {
        const text = this.doc.getText();
        const tree = await parserMiniAst(text, this.doc.languageId);
        this.webviewPanel.webview.postMessage({
            command: 'update',
            tree: JSON.stringify(tree)
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
                    content="default-src 'none'; img-src ${cspSource}; style-src ${cspSource}; script-src 'nonce-${nonce}';"
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