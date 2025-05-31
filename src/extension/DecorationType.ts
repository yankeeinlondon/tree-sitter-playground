import * as vscode from "vscode";

/**
 * `DecorationType` class definition
 */
export class DecorationType {
    private _decorationType: vscode.TextEditorDecorationType;
    private _ranges: vscode.Range[] = [];
    constructor(
        color: string, 
        private editor: vscode.TextEditor
    ) {
        this._decorationType = vscode.window.createTextEditorDecorationType({
            backgroundColor: color,
            color: '#FFFFFF',
            borderRadius: "4px",

        });
    }

    get decorationType() {
        return this._decorationType;
    }
    get ranges() {
        return this._ranges;
    }

    /**
     * Renders the specified range
     * @param range 
     */
    render(range: vscode.Range) {
        this._ranges.push(range);
        this.editor.setDecorations(this._decorationType, this._ranges);
    }

    /**
     * Clean up all the decorations
     */
    clear() {
        this._ranges = [];
        this.editor.setDecorations(this._decorationType, this._ranges);
    }
}
