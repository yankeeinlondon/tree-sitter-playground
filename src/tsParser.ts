import fs from "fs";
import path from "path";
import { SyntaxNode } from "tree-sitter";
import * as vscode from "vscode";
import { Parser, Edit, Point, TreeCursor } from "web-tree-sitter";


// import Parser, { } from "tree-sitter-typescript";

// wasm file directory
const WASM_DIR = path.join(__dirname, 'tree-sitter');
// Parser instance corresponding to the language
const TS_PARSER = new Map<string, Parser>();

/**
 * Tree-sitter query error
 */
export interface QueryError extends RangeError{
    // The character index where the error occurs
    index: number;
    // Character length
    length: number;
}

/**
 * Indicates the code editing scope, used to update the syntax tree
 */
export class EditRange implements Edit {
    startIndex: number;
    oldEndIndex: number;
    newEndIndex: number;

    startPosition: Point;
    oldEndPosition: Point;
    newEndPosition: Point;

    /**
     * Constructor, create editing scope according to VSCode text change event
     * 
     * @param editChangeEvent VSCode text change event
     * @param document VSCode Document Object
     */
    constructor(
        editChangeEvent: vscode.TextDocumentContentChangeEvent, 
        document: vscode.TextDocument
    ) {
        const { range, rangeOffset, rangeLength, text } = editChangeEvent;

        this.startIndex = rangeOffset;
        this.oldEndIndex = rangeOffset + rangeLength;
        this.newEndIndex = rangeOffset + text.length;

        this.startPosition = EditRange.asTSPoint(range.start);
        this.oldEndPosition = EditRange.asTSPoint(range.end);
        this.newEndPosition = EditRange.asTSPoint(document.positionAt(this.newEndIndex));
    }

    /**
     * Convert VSCode's Position to Tree-sitter's Point
     * 
     * @param position VSCode's Position object
     * @returns Tree-sitter Point object
     */
    static asTSPoint(position: vscode.Position): Point {
        const { line, character } = position;
        return { row: line, column: character };
    }

    /**
     * Convert Tree-sitter's Point to VSCode's Position
     * 
     * @param Position Tree-sitter Point object
     * @returns VSCode's Position object
     */
    static asVsPosition(point: Point):vscode.Position{
        const {row, column} = point;

        return new vscode.Position(row, column);
    }
}

/**
 * Represents a simplified node of the syntax tree, containing 
 * basic information about the node
 */
export class MiniNode {
    id: number;
    typeId: number;
    grammarId: number;
    type: string;
    grammarType: string;
    isNamed: boolean;
    isMissing: boolean;
    isExtra: boolean;
    hasChanges: boolean;
    hasError: boolean;
    isError: boolean;
    text: string;
    parseState: number;
    nextParseState: number;
    startPosition: Point;
    endPosition: Point;
    startIndex: number;
    endIndex: number;
    parentId?: number;
    children?: Array<MiniNode>;
    namedChildren?: Array<MiniNode>;
    childCount: number;
    namedChildCount: number;
    descendantCount: number;
    level: number;
    fieldId: number;
    fieldName?: string;

    /**
     * Constructor, creates a simplified node based on the syntax node of Tree-sitter
     * @param node Tree-sitter syntax nodes
     * @param walk Tree-sitter cursor object
     */
    constructor(node: SyntaxNode, walk?: TreeCursor) {
        this.id = node.id;
        this.typeId = node.typeId;
        this.grammarId = node.grammarId;
        this.type = node.type;
        this.grammarType = node.grammarType;
        this.isNamed = node.isNamed;
        this.isMissing = node.isMissing;
        this.isExtra = node.isExtra;
        this.hasChanges = node.hasChanges;
        this.hasError = node.hasError;
        this.isError = node.isError;
        this.text = node.text;
        this.parseState = node.parseState;
        this.nextParseState = node.nextParseState;
        this.startPosition = node.startPosition;
        this.endPosition = node.endPosition;
        this.startIndex = node.startIndex;
        this.endIndex = node.endIndex;
        this.parentId = node.parent?.id;
        this.childCount = node.childCount;
        this.namedChildCount = node.namedChildCount;
        this.descendantCount = node.descendantCount;
        this.level = walk?.currentDepth || 0;
        this.fieldId = walk?.currentFieldId || -1;
        this.fieldName = walk?.currentFieldName || "";
    }
}
export interface MiniCapture{
    pattern: number;
    color: string;
    name: string;
    node: MiniNode;
}
/**
 * Recursively process syntax tree nodes
 * 
 * @param node Syntax tree nodes
 * @param handler callback function
 */
export async function handlerSyntaxNodeByRecursion(
    node: SyntaxNode,
    handler: (node: SyntaxNode, walk: TreeCursor) => void
) {
    const walk = node.walk();
    let walkIn = true;
    do {
        if (!walkIn) {
            // 向父节点游走
            if (!walk.gotoParent() || walk.nodeId === node.id) {
                break;
            }
            if (!walk.gotoNextSibling()) {
                continue;
            }
        }
        walkIn = true;
        handler(walk.currentNode, walk);
        if (walk.gotoFirstChild()) {
            continue;
        }
        if (walk.gotoNextSibling()) {
            continue;
        }
        walkIn = false;
    } while (true);
}

/**
 * Editing Syntax Tree
 * 
 * @param tree Syntax Tree
 * @param editChangeEvent Text change event
 * @param document VSCode Document Object
 * @returns Updated syntax tree
 */
export async function editTree(
    tree: Parser.Tree,
    editChangeEvent: vscode.TextDocumentContentChangeEvent,
    document: vscode.TextDocument
) {
    const parser = await getParser(document.languageId);
    const editRange = new EditRange(editChangeEvent, document);
    tree.edit(editRange);
    return parser.parse(document.getText(), tree);
}

/**
 * Get the Parser instance of the specified language
 * 
 * @param language language
 * @returns language parser
 */
export async function getParser(language: string) {
    let parser = TS_PARSER.get(language);
    if (parser) {
        return parser;
    }
    // 检查wasm文件
    const error = await checkLanguageWasm(language);
    if (error) {
        vscode.window.showErrorMessage(error);
        throw new Error(error);
    }
    // 初始化Parser实例
    return initTSParser(language);
}

/**
 * Initializes a Parser instance for the specified language
 * 
 * @param language language
 * @returns language parser
 */
async function initTSParser(language: string) {
    await Parser.init({locateFile: (pathName:string)=> path.join(WASM_DIR, pathName)});
    const parser = new Parser();
    const wasmPath = path.resolve(WASM_DIR, `${getWasmId(language)}.wasm`);
    const languageWasm = await Parser.Language.load(wasmPath);
    parser.setLanguage(languageWasm);
    TS_PARSER.set(language, parser);
    return parser;
}

/**
 * Check if there is a wasm file in the specified language, and download 
 * it if it does not exist
 * 
 * @param language 语言
 * @returns if there is an error, it returns the _error message_, otherwise it returns `undefined`
 */
async function checkLanguageWasm(language: string): Promise<any> {
    const wasmPath = path.resolve(WASM_DIR, `${getWasmId(language)}.wasm`);
    if (!fs.existsSync(wasmPath)) {
        if (!fs.existsSync(WASM_DIR)) {
            fs.mkdirSync(WASM_DIR);
        }
        // Download the wasm file to the wasm directory
        return downloadWasmFile(language, wasmPath);
    }
}

/**
 * Download the wasm file of the specified language to the specified path
 * 
 * @param language language
 * @param wasmPath WASM file save path
 * @returns a promised which when resolved indicates the outcome of the operation
 */
function downloadWasmFile(language: string, wasmPath: string): Promise<string | null> {
    return new Promise<string | null>((resolve, reject) => {
        vscode.window.withProgress(
            {
                title: `Downloading ${language} wasm file`,
                location: vscode.ProgressLocation.Notification,
            },
            async (progress, cancleToken) => {
                // Download wasm file using fetch
                const wasmUrl = `https://tree-sitter.github.io/tree-sitter-${language}.wasm`;
                try {
                    const response = await fetch(wasmUrl);
                    if (!response.ok) {
                        throw new Error(response.statusText);
                    }
                    const arrayBuffer = await response.arrayBuffer();
                    const buffer = Buffer.from(arrayBuffer);
                    fs.writeFileSync(wasmPath, buffer);
                    resolve(null);
                } catch (error) {
                    console.error(`Failed to download wasm file. Url: ${wasmUrl}, Error: ${error}`);
                    resolve(`Failed to download wasm file. Url: ${wasmUrl}, Error: ${error}`);
                } finally {
                    progress.report({ increment: 100 });
                }
            }
        );
    });
}

/**
 * Get the WASM file name that complies with tree-sitter
 * 
 * @param language Language Identifier
 * @returns WASM file name
 */
function getWasmId(language: string): string{
    let wasmId = `tree-sitter-${language}`;

    // The naming style of C# language ID in VS Code is inconsistent 
    // with that of tree-sitter. Here is a correction
    if (language === "csharp") {
        wasmId = "tree-sitter-c_sharp";
    }
    return wasmId;
}
