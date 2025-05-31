import * as vscode from "vscode";
import { AstWebview } from "./AstWebview";
import { AstWebviewSerializer } from "./AstWebviewSerializer";
import { SerializeAstWebview } from "./SerializeAstWebview";


/**
 * `ASTWebviewManager` 
 * 
 * used to manage the creation and restoration 
 * of the syntax tree Webview.
 */
export class ASTWebviewManager {
    private static _extensionContext: vscode.ExtensionContext;
    private static _cache = new Map<string, AstWebview>();

    /**
     * Get the extension context
     * 
     * @returns {vscode.ExtensionContext} Extended context
     */
    public static get extensionContext(): vscode.ExtensionContext {
        return this._extensionContext;
    }

    /**
     * Initialization Manager
     * 
     * @param {vscode.ExtensionContext} extensionContext Extended context
     */
    static initManager(extensionContext: vscode.ExtensionContext) {
        if (this._extensionContext) {
            console.error(`ASTWebviewManager has been initialized successfully.`);
            return;
        }
        this._extensionContext = extensionContext;
        // Register a web view serializer
        vscode.window.registerWebviewPanelSerializer(
            AstWebview.viewType, 
            new AstWebviewSerializer()
        );
    }

    /**
     * Create a web view of a syntax tree
     * 
     * @param {vscode.TextDocument} doc documents opened by vscode
     * @param {SerializeAstWebview} serializeWebview optional, serialized webview
     */
    static async createAstWebview(doc: vscode.TextDocument, serializeWebview?: SerializeAstWebview) {
        let astWebview = this._cache.get(doc.uri.toString());
        if (astWebview) {
            astWebview.webviewPanel.reveal();
            lastWebviewPanel.value = astWebview.webviewPanel;
            console.log('[AstWebviewManager] set lastWebviewPanel (existing)', !!lastWebviewPanel.value);
            return;
        }
        astWebview = new AstWebview(doc, serializeWebview);
        this._cache.set(doc.uri.toString(), astWebview);
        lastWebviewPanel.value = astWebview.webviewPanel;
        console.log('[AstWebviewManager] set lastWebviewPanel (new)', !!lastWebviewPanel.value);
    }

    /**
     * Deletes the cache for the specified URI.
     *
     * @param uri - The URI whose cache is to be deleted.
     */
    static deleteCache(uri: vscode.Uri) {
        this._cache.delete(uri.toString());
    }
}

// Export a mutable reference for test visibility
export const lastWebviewPanel: { value: vscode.WebviewPanel | undefined } = { value: undefined };
