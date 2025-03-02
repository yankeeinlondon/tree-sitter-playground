import * as vscode from "vscode";
import { MiniNode } from "./tsParser";

/**
 * 装饰类型
 */
class DecorationType {
    private _decorationType: vscode.TextEditorDecorationType;
    private _ranges: vscode.Range[] = [];
    constructor(color: string, private editor: vscode.TextEditor) {
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
     * 渲染指定的范围
     * @param range 
     */
    render(range: vscode.Range) {
        this._ranges.push(range);
        this.editor.setDecorations(this._decorationType, this._ranges);
    }

    /**
     * 清理所有的装饰
     */
    clear() {
        this._ranges = [];
        this.editor.setDecorations(this._decorationType, this._ranges);
    }
}

// 编辑器内的选中装饰类型，即编辑器内字符选中后的样式
export const selectedDecorationType = vscode.window.createTextEditorDecorationType({
    backgroundColor: "#125381 !important",
    borderRadius: "4px",
    color: "#ea00b1",
    fontWeight: "bold",
    border: "1px solid #ea00b1",
});

// 编辑器内的颜色装饰类型
const editorDecorationType: Map<string, DecorationType> = new Map();
/**
 * 获取颜色对应的装饰类型
 * @param color 
 * @param editor 
 * @returns 
 */
export function getDecorationTypeForColor(color: string, editor: vscode.TextEditor): DecorationType {
    if (editorDecorationType.has(color)) {
        return editorDecorationType.get(color)!;
    }
    const decorationType = new DecorationType(color, editor);
    editorDecorationType.set(color, decorationType);
    return decorationType;
}


/**
 * 编辑器装饰器
 */
export class EditorDecorationer {
    private doc: vscode.TextDocument;
    constructor(private editor: vscode.TextEditor) {
        this.doc = editor.document;
    }

    /**
     * 渲染选中的范围
     * @param startIndex 
     * @param endIndex 
     */
    renderSelectRange(startIndex: number, endIndex: number) {
        this.editor.setDecorations(selectedDecorationType, []);
        if (startIndex && endIndex) {
            const start = this.doc.positionAt(startIndex);
            const end = this.doc.positionAt(endIndex);
            
            this.editor.setDecorations(selectedDecorationType, [new vscode.Range(start, end)]);
            // 滚动到选中的内容
            this.editor.revealRange(new vscode.Selection(start, end), vscode.TextEditorRevealType.InCenter);
        }
    }

    /**
     * 渲染捕获节点的范围 
     * @param node 
     * @param color 
     */
    renderCaptureRange(node: MiniNode, color: string) {
        const decorationType = getDecorationTypeForColor(color, this.editor);
        const start = this.doc.positionAt(node.startIndex);
        const end = this.doc.positionAt(node.endIndex);
        decorationType.render(new vscode.Range(start, end));
    }

    /**
     * 清理所有的装饰
     */
    clear() {
        editorDecorationType.forEach((value) => value.clear());
        this.editor.setDecorations(selectedDecorationType, []);
    }
}