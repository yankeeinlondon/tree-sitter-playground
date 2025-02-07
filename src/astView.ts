import path from "path";
import * as vscode from "vscode";
import { Tree } from "web-tree-sitter";
import { editTree, handlerSyntaxNodeByRecursion, MiniNode, parserAst } from "./parser";
/**
 * webview状态数据类型
 */
interface AstWebviewState {
    // 文档的uri地址
    docUri: string;
    // 扁平化的语法树节点数组
    nodes: MiniNode[];
    // 是否启用查询
    enableQuery: boolean;
    // 缓存的查询语句
    queryText: string;
    // 是否显示匿名节点
    showAnonymousNodes: boolean;
    // 是否启用编辑器同步功能
    enableEditorSync: boolean;
}

/**
 * 序列化的抽象语法树webview
 */
interface SerializeAstWebview {
    // 序列化的webview面板
    webviewPanel: vscode.WebviewPanel;
    // 序列化的状态数据
    state: AstWebviewState;
}

/**
 * ASTWebviewManager 类，用于管理语法树 Webview 的创建和恢复
 */
export class ASTWebviewManager {
    private static _extensionContext: vscode.ExtensionContext;
    private static _cache = new Map<string, AstWebview>();

    /**
     * 获取扩展上下文
     * @returns {vscode.ExtensionContext} 扩展上下文
     */
    public static get extensionContext(): vscode.ExtensionContext {
        return this._extensionContext;
    }

    /**
     * 初始化管理器
     * @param {vscode.ExtensionContext} extensionContext 扩展上下文
     */
    static initManager(extensionContext: vscode.ExtensionContext) {
        if (this._extensionContext) {
            console.error(`ASTWebviewManager has been initialized successfully.`);
            return;
        }
        this._extensionContext = extensionContext;
        // 注册一个web视图序列化器
        vscode.window.registerWebviewPanelSerializer(AstWebview.viewType, new AstWebviewSerializer());
    }

    /**
     * 创建一个语法树的web视图
     * @param {vscode.TextDocument} doc vscode打开的文档
     * @param {SerializeAstWebview} serializeWebview 可选，序列化的webview
     */
    static async createAstWebview(doc: vscode.TextDocument, serializeWebview?: SerializeAstWebview) {
        let astWebview = this._cache.get(doc.uri.toString());
        if (astWebview) {
            astWebview.webviewPanel.reveal();
            return;
        }
        astWebview = new AstWebview(doc, serializeWebview);
        this._cache.set(doc.uri.toString(), astWebview);
    }

    /**
     * 删除指定 URI 的缓存。
     *
     * @param uri - 要删除缓存的 URI。
     */
    static deleteCache(uri: vscode.Uri) {
        this._cache.delete(uri.toString());
    }
}

/**
 * AstWebviewSerializer 类，用于序列化和反序列化 Webview
 */
export class AstWebviewSerializer implements vscode.WebviewPanelSerializer<AstWebviewState> {
    /**
     * 反序列化 Webview
     * @param {vscode.WebviewPanel} webviewPanel Webview 面板
     * @param {any} state 在 Webview 中持久化的状态
     */
    async deserializeWebviewPanel(webviewPanel: vscode.WebviewPanel, state: AstWebviewState) {
        //恢复 Webview 的内容，确保我们保留传入的 `webviewPanel` 并恢复我们需要的任何事件监听器
        try {
            const doc = await vscode.workspace.openTextDocument(vscode.Uri.parse(state.docUri));
            ASTWebviewManager.createAstWebview(doc, { webviewPanel, state });
        } catch (error) {
            console.error(error);
        }
    }
}

/**
 * 语法树web视图类
 */
class AstWebview {
    public static readonly viewType = "tree-sitter-viewer.ast-webview";
    // 打开的代码文档
    private readonly doc: vscode.TextDocument;
    private _webviewPanel!: vscode.WebviewPanel;
    private visible: boolean = false;
    private state!: AstWebviewState;
    private astTree!: Tree;
    public get webviewPanel() {
        return this._webviewPanel;
    }

    /**
     * 构造函数
     * @param {vscode.TextDocument} doc vscode打开的文档
     * @param {SerializeAstWebview} serializeAstWebview 序列化的Webview
     */
    constructor(doc: vscode.TextDocument, serializeAstWebview?: SerializeAstWebview) {
        this.doc = doc;
        this.initWebviewPanel(serializeAstWebview);
        parserAst(this.doc.getText(), this.doc.languageId).then((tree) => {
            this.astTree = tree;
            this.refreshWebview();
        });
    }

    private initWebviewPanel(serializeAstWebview?: SerializeAstWebview) {
        if (serializeAstWebview) {
            this._webviewPanel = serializeAstWebview.webviewPanel;
            this.state = serializeAstWebview.state;
        } else {
            // 创建一个新的webviewPanel
            const viewTitle = `${path.basename(this.doc.fileName)} - Ast`;
            this._webviewPanel = vscode.window.createWebviewPanel(
                AstWebview.viewType,
                viewTitle,
                vscode.ViewColumn.Beside,
                { enableFindWidget: true }
            );
            this._webviewPanel.webview.options = { enableScripts: true };
            this.state = {
                docUri: this.doc.uri.toString(),
                nodes: [],
                enableQuery: false,
                queryText: "",
                showAnonymousNodes: false,
                enableEditorSync: true,
            };
        }
        this.visible = this._webviewPanel.visible;
        this.handlerEvent();
        // 更新webview页面内容
        this._webviewPanel.webview.html = this.getHtml();
    }

    private handlerEvent() {
        // 监听由webview传递的消息
        const receiveMessageDispose = this._webviewPanel.webview.onDidReceiveMessage((event) => {
            const { command, value } = event;
            switch (command) {
                case "showAnonymousNodes":
                    this.state.showAnonymousNodes = value;
                    this.refreshWebview();
                    break;
                case "enableEditorSync":
                    this.state.enableEditorSync = value;
                    break;
                case "selectEditorText":
                    const { startIndex, endIndex } = value;
                    const selectNode = this.astTree.rootNode.descendantForIndex(Number(startIndex), Number(endIndex));
                    // TODO 实现选中编辑器内容
                    break;
                default:
            }
        });

        // 监听webview的状态变化
        const webviewSateChangeDispose = this._webviewPanel.onDidChangeViewState((event) => {
            if (!this.visible && this._webviewPanel.visible) {
                // 刷新视图内容
                this.refreshWebview();
                let viewColumn = vscode.ViewColumn.One;
                if (this._webviewPanel.viewColumn === vscode.ViewColumn.One) {
                    viewColumn = vscode.ViewColumn.Beside;
                }
                // 将doc对应的文本编辑器设置为可见状态
                vscode.window.showTextDocument(this.doc, { preserveFocus: true, preview: false, viewColumn });
            }
            this.visible = this._webviewPanel.visible;
        });

        // 监听文档的修改事件
        const textDocChangeDispose = vscode.workspace.onDidChangeTextDocument(async ({ document, contentChanges }) => {
            if (document.uri.toString() === this.doc.uri.toString()) {
                for (const change of contentChanges) {
                    // 增量更新语法树
                    this.astTree = await editTree(this.astTree, change, document);
                }
                if (contentChanges.length > 0) {
                    await this.refreshWebview();
                }
            }
        });

        // 监听文本编辑器的滚动事件
        const changeVisibleRangesDispose = vscode.window.onDidChangeTextEditorVisibleRanges(
            ({ textEditor, visibleRanges }) => {
                const eventDoc = textEditor.document;
                if (
                    this.state.enableEditorSync &&
                    this.visible &&
                    this.doc.uri.toString() === eventDoc.uri.toString()
                ) {
                    this._webviewPanel.webview.postMessage({
                        command: "scroll",
                        data: JSON.stringify(visibleRanges[0].start),
                    });
                }
            }
        );

        // 监听编辑器的点击和文本选中事件
        const changeSelectionDispose = vscode.window.onDidChangeTextEditorSelection(({ textEditor, selections }) => {
            const eventDoc = textEditor.document;
            if (this.state.enableEditorSync && this.visible && this.doc.uri.toString() === eventDoc.uri.toString()) {
                const { anchor, active, isReversed, isEmpty } = selections[0];
                const startPosition = isReversed ? active : anchor;
                const endPosition = isReversed ? anchor : active;

                // TODO 实现编辑器定位到抽象语法树
                /* this._webviewPanel.webview.postMessage({
            command: "goto",
            data: JSON.stringify({startPosition, endPosition: isEmpty ? undefined : endPosition})
        }); */
            }
        });

        // webview销毁事件
        this._webviewPanel.onDidDispose(() => {
            receiveMessageDispose.dispose();
            webviewSateChangeDispose.dispose();
            textDocChangeDispose.dispose();
            changeVisibleRangesDispose.dispose();
            changeSelectionDispose.dispose();
            ASTWebviewManager.deleteCache(this.doc.uri);
        });
    }

    /**
     * 将路径转换为 Webview URI
     * @param {...string} paths 路径
     * @returns {vscode.Uri} Webview URI
     */
    private asWebviewUri(...paths: string[]): vscode.Uri {
        const path = vscode.Uri.joinPath(ASTWebviewManager.extensionContext.extensionUri, "resources", ...paths);
        return this._webviewPanel.webview.asWebviewUri(path);
    }

    /**
     * 刷新 Webview 内容
     */
    async refreshWebview() {
        this.state.nodes = [];
        await handlerSyntaxNodeByRecursion(this.astTree.rootNode, (node, walk) => {
            if (this.state.showAnonymousNodes || walk.nodeIsNamed) {
                this.state.nodes.push(new MiniNode(node, walk));
            }
        });

        this._webviewPanel.webview.postMessage({
            command: "refresh",
            data: JSON.stringify(this.state),
        });
    }

    /**
     * 获取 HTML 内容
     * @returns {string} HTML 内容
     */
    private getHtml(): string {
        const styleVSCodeUri = this.asWebviewUri("css", "vscode.css");
        const astEditorUri = this.asWebviewUri("css", "astEditor.css");
        const scriptUri = this.asWebviewUri("js", "astView.js");
        const cspSource = this._webviewPanel.webview.cspSource;
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
                        <input type="checkbox" id="editor-sync-checkbox" ></input>
                        <label for="editor-sync-checkbox">编辑器联动</label>
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

/**
 * 生成随机字符串
 * @returns {string} 随机字符串
 */
function getNonce(): string {
    let text = "";
    const possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (let i = 0; i < 32; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
}
