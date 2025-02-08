const queryContainer = document.getElementById("query-container");
const queryTextarea = document.getElementById("query-input");
const showAnonymousCheckbox = document.getElementById("show-anonymous-checkbox");
const enableQueryCheckbox = document.getElementById("enabled-query-checkbox");
const editorSyncCheckbox = document.getElementById("editor-sync-checkbox");

const vscode = acquireVsCodeApi();

/**
 * 全局状态类，用于管理webview的状态
 */
class GlobalState {
    docUri = "";
    nodes = [];
    enableQuery = false;
    queryText = "";
    showAnonymousNodes = false;
    enableEditorSync = true;

    /**
     * 设置状态
     * @param {Object} state 状态对象
     */
    setState(state) {
        Object.assign(this, state);
        vscode.setState(this);

        showAnonymousCheckbox.checked = this.showAnonymousNodes;
        enableQueryCheckbox.checked = this.enableQuery;
        editorSyncCheckbox.checked = this.enableEditorSync;
        queryTextarea.value = this.queryText;
        queryContainer.style.display = this.enableQuery ? "block" : "none";

        updateTree(this.nodes);
    }

    /**
     * 设置文档URI
     * @param {string} value 文档URI
     */
    setDocUri(value) {
        this.docUri = value;
        vscode.setState(this);
    }

    /**
     * 设置节点数组
     * @param {Array} value 节点数组
     */
    setNodes(value = []) {
        this.nodes = value;
        vscode.setState(this);
        updateTree(this.nodes);
    }

    /**
     * 设置是否启用查询
     * @param {boolean} value 是否启用查询
     */
    setEnableQuery(value) {
        this.enableQuery = value;
        vscode.setState(this);
        queryContainer.style.display = this.enableQuery ? "block" : "none";
    }

    /**
     * 设置查询文本
     * @param {string} value 查询文本
     */
    setQueryText(value) {
        this.queryText = value;
        vscode.setState(this);
    }

    /**
     * 设置是否显示匿名节点
     * @param {boolean} value 是否显示匿名节点
     */
    setShowAnonymousNodes(value) {
        this.showAnonymousNodes = value;
        vscode.setState(this);
    }

    /**
     * 设置是否启用编辑器同步
     * @param {boolean} value 是否启用编辑器同步
     */
    setEnableEditorSync(value) {
        this.enableEditorSync = value;
        vscode.setState(this);
    }
}

(function () {
    const globalState = new GlobalState(); // 每次重新加载页面时尝试恢复状态中的数据

    // 添加接收消息的监听
    window.addEventListener("message", (event) => {
        const { command, data } = event.data;
        switch (command) {
            case "refresh":
                globalState.setState(JSON.parse(data));
                break;
            case "scroll":
                // 随编辑器滚动
                const { line } = JSON.parse(data);
                const items = document.getElementsByClassName(`row-${line}`);
                items &&
                    items.length > 0 &&
                    items[0].scrollIntoView({
                        behavior: "smooth", // 平滑滚动
                        block: "start", // 元素顶部对齐视口顶部
                    });
                break;
            case "gotoNode":
                // 定位到指定节点
                const { id } = JSON.parse(data);
                const element = document.getElementById(id);
                if (element) {
                    document.querySelectorAll("a.node-link-selected").forEach((item) => {
                        item.classList.remove("node-link-selected");
                    });
                    element.classList.add("node-link-selected");
                    element.scrollIntoView({ behavior: "smooth", block: "center" });
                }
                break;
        }
    });

    showAnonymousCheckbox.addEventListener("change", (that, event) => {
        const checked = showAnonymousCheckbox.checked;
        vscode.postMessage({ command: "showAnonymousNodes", value: checked });
        globalState.setShowAnonymousNodes(checked);
    });
    enableQueryCheckbox.addEventListener("change", (that, event) => {
        globalState.setEnableQuery(enableQueryCheckbox.checked);
    });
    queryTextarea.addEventListener("change", (that, event) => {
        globalState.setQueryText(queryTextarea.value);
    });
    editorSyncCheckbox.addEventListener("change", (that, event) => {
        const checked = editorSyncCheckbox.checked;
        vscode.postMessage({ command: "enableEditorSync", value: checked });
        globalState.setEnableEditorSync(editorSyncCheckbox.checked);
    });
    document.body.addEventListener('click', ({ target }) => {
        if (!target.classList.contains("node-link")) {
            vscode.postMessage({ command: "selectEditorText", value: { startIndex: '', endIndex: '', isClick: true } });
        }
    });
})();

/**
 * 更新语法树
 * @param {Array} nodes 节点数组
 */
function updateTree(nodes) {
    if (!nodes || nodes.length <= 0) {
        return;
    }
    const nodeArray = typeof nodes === "string" ? JSON.parse(nodes) : nodes;
    const htmls = treeNodeToHtml(nodeArray);
    const rowContianer = document.getElementById("output-container");
    const rowNumberContainer = document.getElementById("row-number-container");
    rowContianer.innerHTML = htmls.rows;
    rowNumberContainer.innerHTML = htmls.rowNumbers;
    // 监听节点元素鼠标悬浮事件
    rowContianer.addEventListener("mouseover", (event) => {
        const element = event.target;
        if (element.classList.contains("node-link")) {
            vscode.postMessage({ command: "selectEditorText", value: JSON.parse(JSON.stringify(element.dataset)) });
        }
    });
    // 监听节点元素鼠标点击事件
    rowContianer.addEventListener("click", (event) => {
        const element = event.target;
        if (element.classList.contains("node-link")) {
            const data = element.dataset;
            data['isClick'] = true;
            vscode.postMessage({ command: "selectEditorText", value: JSON.parse(JSON.stringify(data)) });
        }
    });
}

/**
 * 将语法树节点转换为HTML
 * @param {Array} nodes 节点数组
 * @returns {Object} 包含HTML字符串的对象
 */
function treeNodeToHtml(nodes) {
    let rows = "",
        rowNumbers = "";
    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        const { row: startRow, column: startColumn } = node.startPosition;
        const { row: endRow, column: endColumn } = node.endPosition;
        // 设置缩进
        const indentHtml = `<span class="indent">&nbsp;&nbsp;</span>`.repeat(node.level);
        rows +=
            `<div class="row row-id-${node.id}">
            ${indentHtml}${node.fieldName && (node.fieldName + ":&nbsp;")}
            <a class="node-link a-${node.id} ${node.isNamed ? "named" : "anonymous"}" 
                id="${node.id}"
                href="javascript:void(0);" 
                data-id="${node.id}"
                data-range="${startRow},${startColumn},${endRow},${endColumn}" 
                data-start-index="${node.startIndex}" 
                data-end-index="${node.endIndex}">${node.type}</a>
            <span class="position-info">[${startRow},${startColumn}] - [${endRow},${endColumn}]</span>
        </div>`;
        rowNumbers += `<div class="row row-${startRow}" id="rc-${startRow}-${startColumn}">${i + 1}</div>`;
    }
    return { rows, rowNumbers };
}

/**
 * 定位到编辑器
 */
function gotoEditor() {
    console.log(this);
}
