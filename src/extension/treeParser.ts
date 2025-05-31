import fs from "fs";
import path from "path";
import * as vscode from "vscode";
import { 
    Parser, 
    TreeCursor, 
    Tree, 
    Language 
} from "web-tree-sitter";

import type { Node } from "web-tree-sitter";
import { EditRange } from "./EditRange";


/** WASM file directory */
const WASM_DIR = path.join(__dirname, 'wasm');

/** 
 * An in-memory cash of the Parser's which have been used
 */
const PARSER = new Map<string, Parser>();


/**
 * Recursively process syntax tree nodes
 * 
 * @param node Syntax tree nodes
 * @param handler callback function
 */
export async function handlerSyntaxNodeByRecursion(
    node: Node,
    handler: (node: Node, walk: TreeCursor) => void
) {
    const walk = node.walk();
    let walkIn = true;
    do {
        if (!walkIn) {
            // Move to the parent node
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
    tree: Tree,
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
    let parser = PARSER.get(language);
    if (parser) {
        return parser;
    }
    // Check wasm file
    const error = await checkLanguageWasm(language);
    if (error) {
        vscode.window.showErrorMessage(error);
        throw new Error(error);
    }
    // Initialize Parser instance
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
    const languageWasm = await Language.load(wasmPath);
    parser.setLanguage(languageWasm);
    PARSER.set(language, parser);
    return parser;
}

/**
 * Check if there is a wasm file in the specified language, 
 * and download 
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
    return new Promise<string | null>((resolve) => {
        vscode.window.withProgress(
            {
                title: `Downloading ${language} wasm file`,
                location: vscode.ProgressLocation.Notification,
            },
            async (progress, _token) => {
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
