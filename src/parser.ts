import fs from "fs";
import path from "path";
import * as vscode from "vscode";
import Parser, { Point, SyntaxNode } from "web-tree-sitter";

// wasm文件目录
const WASM_DIR = __dirname;
// 语言对应的Parser实例
const TS_PARSER = new Map<string, Parser>();

class MiniNode {
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
    children: Array<MiniNode>;
    namedChildren: Array<MiniNode>;
    childCount: number;
    namedChildCount: number;
    descendantCount: number;
    constructor(node: SyntaxNode) {
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
        this.children = node.children.map(child => new MiniNode(child));
        this.namedChildren = node.namedChildren.map(child => new MiniNode(child));
    }
}

/**
 * 解析代码文本生成语法树
 * @param text 代码文本
 * @param language 语言
 * @returns 
 */
export async function parserMiniAst(text: string, language: string) {
    // 获取Parser实例
    const parser = await getParser(language);
    // 解析代码文本生成语法树
    const tree = parser.parse(text);
    // 返回根节点
    return new MiniNode(tree.rootNode);
}

/**
 * 获取指定语言的Parser实例
 * @param language 语言
 * @returns
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
 * 初始化指定语言的Parser实例
 * @param language 语言
 * @returns
 */
async function initTSParser(language: string) {
    await Parser.init();
    const parser = new Parser();
    const wasmPath = path.resolve(WASM_DIR, `tree-sitter-${language}.wasm`);
    const languageWasm = await Parser.Language.load(wasmPath);
    parser.setLanguage(languageWasm);
    TS_PARSER.set(language, parser);
    return parser;
}

/**
 * 检查是否存在指定语言的wasm文件，如果不存在则下载
 * @param language 语音
 * @returns
 */
async function checkLanguageWasm(language: string) {
    const wasmPath = path.resolve(WASM_DIR, `tree-sitter-${language}.wasm`);
    if (!fs.existsSync(wasmPath)) {
        // 下载wasm文件
        if (!fs.existsSync(WASM_DIR)) {
            fs.mkdirSync(WASM_DIR);
        }
        // 下载wasm文件到wasm目录下
        return downloadWasmFile(language, wasmPath);
    }
}

/**
 * 下载指定语言的wasm文件到指定路径
 * @param language 语言
 * @param wasmPath wasm文件保存路径
 * @returns
 */
function downloadWasmFile(language: string, wasmPath: string): Promise<any> {
    return new Promise<void>((resolve, reject) => {
        vscode.window.withProgress(
            {
                title: `Downloading ${language} wasm file`,
                location: vscode.ProgressLocation.Notification,
            },
            async (progress, cancleToken) => {
                // 使用fetch下载wasm文件
                const wasmUrl = `https://tree-sitter.github.io/tree-sitter-${language}.wasm`;
                try {
                    const response = await fetch(wasmUrl);
                    if (!response.ok) {
                        throw new Error(response.statusText);
                    }
                    const arrayBuffer = await response.arrayBuffer();
                    const buffer = Buffer.from(arrayBuffer);
                    fs.writeFileSync(wasmPath, buffer)
                    resolve();
                } catch (error) {
                    console.error(`Failed to download wasm file. Url: ${wasmUrl}, Error: ${error}`);
                    reject(`Failed to download wasm file. Url: ${wasmUrl}, Error: ${error}`);
                } finally {
                    progress.report({ increment: 100 });
                }
            }
        );
    });
}
