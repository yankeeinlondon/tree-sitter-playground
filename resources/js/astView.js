(function () {
    const vscode = acquireVsCodeApi();
    // 发送一个消息
    vscode.postMessage({
        command: 'alert',
        text: '🐛  on line '
    })

    // 添加接收消息的监听
    window.addEventListener('message', event => {
        const message = event.data; // The JSON data our extension sent
        switch (message.command) {
            case 'update':
                const { docUri, nodes } = message;
                updateTree(nodes)
                vscode.setState({ docUri, nodes });
                break;
            case 'scroll':
                // TODO 随编辑器滚动
                break;
            case 'goto':
                // 定位到指定节点
                break;
        }
    });

    // 每次重新加载页面时尝试恢复状态中的数据
    const state = vscode.getState();
    if (state && state.nodes) {
        updateTree(state.nodes);
    }
})()

/**
 * 更新语法树
 * @param {[*]} nodes 
 */
function updateTree(nodes) {
    const nodeArray = JSON.parse(nodes);
    const htmls = treeNodeToHtml(nodeArray);
    const rowContianer = document.getElementById('output-container');
    const rowNumberContainer = document.getElementById('row-number-container');
    rowContianer.innerHTML = htmls.rows;
    rowNumberContainer.innerHTML = htmls.rowNumbers;
}

function treeNodeToHtml(nodes) {
    let rows = "", rowNumbers = "";
    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        const { row: startRow, column: startColumn } = node.startPosition;
        const { row: endRow, column: endColumn } = node.endPosition;
        // 设置缩进
        const indentHtml = `<span class="indent">&nbsp;&nbsp;&nbsp;&nbsp;</span>`.repeat(node.level);
        rows += `<div class="row">${indentHtml}${node.fieldName && node.fieldName + ': '}<a class="node-link ${node.isNamed ? 'named' : 'anonymous'}" href="#" data-id="${node.id}" data-range="${startRow},${startColumn},${endRow},${endColumn}">${node.type}</a> <span class="position-info">[${startRow},${startColumn}] - [${endRow},${endColumn}]</span></div>`;
        rowNumbers += `<div class="row">${i + 1}</div>`;
    }
    return { rows, rowNumbers }
}