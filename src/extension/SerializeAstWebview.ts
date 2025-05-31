import * as vscode from "vscode";
import { AstWebviewState } from "~/types";

/**
 * Serialized Abstract Syntax Tree WebView
 */
export interface SerializeAstWebview {
    /** Serialized webview panel */
    webviewPanel: vscode.WebviewPanel;
    /** Serialized state data */
    state: AstWebviewState;
}
