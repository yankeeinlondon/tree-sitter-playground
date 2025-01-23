(function () {
    const vscode = acquireVsCodeApi();
    vscode.postMessage({
        command: 'alert',
        text: '🐛  on line '
    })
    window.addEventListener('message', event => {

        const message = event.data; // The JSON data our extension sent

        switch (message.command) {
            case 'update':
                update(message.tree)
                break;
            case 'scroll':
                // TODO 随编辑器滚动
                break;
        }
    });
})()

/**
 * 更新语法树
 * @param {*} tree 
 */
function update(tree) {
    console.log(tree)
}