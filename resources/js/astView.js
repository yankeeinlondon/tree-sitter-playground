const rowContianer = document.getElementById("output-container");
const rowNumberContainer = document.getElementById("row-number-container");
const queryContainer = document.getElementById("query-container");
const queryTextarea = document.getElementById("query-input");
const showAnonymousCheckbox = document.getElementById("show-anonymous-checkbox");
const enableQueryCheckbox = document.getElementById("enabled-query-checkbox");
const nodeMappingCheckbox = document.getElementById("node-mapping-checkbox");
const logOutputCheckbox = document.getElementById("log-output-checkbox");

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
    enableNodeMapping = true;
    logOutput = false;

    /**
     * 设置状态
     * @param {Object} state 状态对象
     */
    setState(state) {
        Object.assign(this, state);
        vscode.setState(this);

        showAnonymousCheckbox.checked = this.showAnonymousNodes;
        enableQueryCheckbox.checked = this.enableQuery;
        nodeMappingCheckbox.checked = this.enableNodeMapping;
        logOutputCheckbox.checked = this.logOutput;
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
    setEnableNodeMapping(value) {
        this.enableNodeMapping = value;
        vscode.setState(this);
    }

    /**
     * 设置是否输出日志
     * @param {boolean} value 
     */
    setLogOutput(value){
        this.logOutput = value;
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

    // 监听显示匿名节点选择框的修改事件，并发送对应状态
    showAnonymousCheckbox.addEventListener("change", (that, event) => {
        const checked = showAnonymousCheckbox.checked;
        vscode.postMessage({ command: "showAnonymousNodes", value: checked });
        globalState.setShowAnonymousNodes(checked);
    });

    // 监听启用查询选择框的修改事件，并发送对应状态
    enableQueryCheckbox.addEventListener("change", (that, event) => {
        const checked = enableQueryCheckbox.checked;
        vscode.postMessage({ command: "enableQuery", value: checked });
        globalState.setEnableQuery(checked);
    });

    // 监听查询输入框的修改事件，并发送对应数据
    queryTextarea.addEventListener("change", (that, event) => {
        const value = queryTextarea.value;
        vscode.postMessage({ command: "queryNode", value });
        globalState.setQueryText(queryTextarea.value);
        // TODO 发送数据
    });

    // 监听节点映射选择框的修改事件，并发送对应状态
    nodeMappingCheckbox.addEventListener("change", (that, event) => {
        const checked = nodeMappingCheckbox.checked;
        vscode.postMessage({ command: "enableNodeMapping", value: checked });
        globalState.setEnableNodeMapping(nodeMappingCheckbox.checked);
    });

    // 监听输出日志选择框的修改事件，并发送对应状态
    logOutputCheckbox.addEventListener("change", (that, event) => {
        const checked = logOutputCheckbox.checked;
        vscode.postMessage({ command: "logOutput", value: checked });
        globalState.setLogOutput(logOutputCheckbox.checked);
    });

    // 监听body的鼠标点击事件，如果点击的不是节点，则发送一个空的位置数据
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
            document.querySelectorAll("a.node-link-selected").forEach((item) => {
                item.classList.remove("node-link-selected");
            });
            element.classList.add("node-link-selected");
            
            const data = Object.assign({isClick: true}, element.dataset);
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
