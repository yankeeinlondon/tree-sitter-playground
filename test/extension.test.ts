import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';
// import * as myExtension from '../extension';



suite('Extension Activation', () => {
  test('Extension should activate', async () => {
    const extension = vscode.extensions.getExtension('yankeinlondon.tree-sitter-playground');
    assert.ok(extension, 'Extension not found');
    await extension!.activate();
    assert.strictEqual(extension!.isActive, true, 'Extension did not activate');
  });
});

suite('Command Registration', () => {
  test('View Syntax Tree command should be registered', async () => {
    const commands = await vscode.commands.getCommands(true);
    assert.ok(commands.includes('tree-sitter-playground.view-syntax-tree'), 'Command not registered');
  });
});

suite('Webview Panel', () => {
  const { lastWebviewPanel } = require('../src/extension/AstWebviewManager');

  test('Should open AST webview panel', async () => {
    // Open a new untitled text document
    const doc = await vscode.workspace.openTextDocument({ content: 'let x = 1;' });
    await vscode.window.showTextDocument(doc);

    // Execute the command
    await vscode.commands.executeCommand('tree-sitter-playground.view-syntax-tree');

    // Wait for the webview panel to be created
    let tries = 0;
    while (!lastWebviewPanel.value && tries < 20) {
      console.log('[test] lastWebviewPanel.value:', lastWebviewPanel.value);
      await new Promise(res => setTimeout(res, 50));
      tries++;
    }
    assert.ok(lastWebviewPanel.value, 'AST webview panel was not created');
    assert.ok(lastWebviewPanel.value.visible !== false, 'AST webview panel is not visible');
  });
});
