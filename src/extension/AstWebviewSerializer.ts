import { AstWebviewState } from "~/types";
import { ASTWebviewManager } from "./AstWebviewManager";
import * as vscode from "vscode"

/**
 * `AstWebviewSerializer` class, used to serialize and deserialize Webview
 */
export class AstWebviewSerializer implements vscode.WebviewPanelSerializer<AstWebviewState> {
    /**
     * Deserialize Webview
     * @param {vscode.WebviewPanel} webviewPanel Webview 面板
     * @param {any} state 在 Webview 中持久化的状态
     */
    async deserializeWebviewPanel(
        webviewPanel: vscode.WebviewPanel, 
        state: AstWebviewState
    ) {
        //Restore the content of the Webview, making sure we preserve the passed in 
        // `webviewPanel` and restore any event listeners we need
        try {
            const doc = await vscode.workspace.openTextDocument(vscode.Uri.parse(state.docUri));
            ASTWebviewManager.createAstWebview(doc, { webviewPanel, state });
        } catch (error) {
            console.error(error);
        }
    }
}
