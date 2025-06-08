import { app } from "../../../scripts/app.js";
import { locales } from "./locales.js";

// 当前语言
let currentLanguage = localStorage.getItem("wr_pocket_tk_language") || "zh";

// 获取翻译
function getTranslation(key, category, language = currentLanguage) {
    if (!locales[language]) return key;
    
    if (category === "nodeDisplayName") {
        if (locales[language].nodeDefs && locales[language].nodeDefs[key]) {
            return locales[language].nodeDefs[key].display_name;
        }
    } else if (category === "nodeCategory") {
        if (locales[language].nodeCategories && locales[language].nodeCategories[key]) {
            return locales[language].nodeCategories[key];
        }
    } else if (category === "input" && key.node && key.input) {
        if (locales[language].nodeDefs && 
            locales[language].nodeDefs[key.node] && 
            locales[language].nodeDefs[key.node].inputs && 
            locales[language].nodeDefs[key.node].inputs[key.input]) {
            return locales[language].nodeDefs[key.node].inputs[key.input].name;
        }
    } else if (category === "output" && key.node && key.output) {
        if (locales[language].nodeDefs && 
            locales[language].nodeDefs[key.node] && 
            locales[language].nodeDefs[key.node].outputs && 
            locales[language].nodeDefs[key.node].outputs[key.output]) {
            return locales[language].nodeDefs[key.node].outputs[key.output].name;
        }
    }
    
    return key;
}

// 切换语言
function switchLanguage(language) {
    if (locales[language]) {
        currentLanguage = language;
        localStorage.setItem("wr_pocket_tk_language", language);
        // 触发事件以更新UI
        document.dispatchEvent(new CustomEvent("wr_pocket_tk_language_changed", { detail: language }));
    }
}

// 添加语言切换按钮
function addLanguageSwitcher() {
    const menuBar = document.querySelector(".comfy-menu");
    if (!menuBar) return;
    
    const languageSwitcher = document.createElement("div");
    languageSwitcher.className = "comfy-menu-btns";
    
    const languages = Object.keys(locales);
    if (languages.length <= 1) return;
    
    languages.forEach(lang => {
        const btn = document.createElement("button");
        btn.textContent = lang.toUpperCase();
        btn.className = "comfy-btn";
        if (lang === currentLanguage) {
            btn.classList.add("comfy-btn-primary");
        }
        
        btn.addEventListener("click", () => {
            document.querySelectorAll(".comfy-menu-btns button").forEach(b => b.classList.remove("comfy-btn-primary"));
            btn.classList.add("comfy-btn-primary");
            switchLanguage(lang);
        });
        
        languageSwitcher.appendChild(btn);
    });
    
    menuBar.appendChild(languageSwitcher);
}

// 当节点显示名称时应用翻译
function applyNodeDisplayName(node) {
    if (node.type && node.constructor.type) {
        const originalName = node.constructor.type;
        const translatedName = getTranslation(originalName, "nodeDisplayName");
        if (translatedName !== originalName) {
            node.title = translatedName;
        }
    }
}

// 当节点分类显示时应用翻译
function applyNodeCategory(node) {
    if (node.category) {
        const originalCategory = node.category;
        const translatedCategory = getTranslation(originalCategory, "nodeCategory");
        if (translatedCategory !== originalCategory) {
            node._category = translatedCategory;
        }
    }
}

// 当输入标签显示时应用翻译
function applyInputLabels(node) {
    if (node.inputs) {
        for (const input of node.inputs) {
            if (input.name && node.type) {
                const originalName = input.name;
                const translatedName = getTranslation({node: node.type, input: originalName}, "input");
                if (translatedName !== originalName) {
                    input._name = translatedName;
                }
            }
        }
    }
}

// 当输出标签显示时应用翻译
function applyOutputLabels(node) {
    if (node.outputs) {
        for (const output of node.outputs) {
            if (output.name && node.type) {
                const originalName = output.name;
                const translatedName = getTranslation({node: node.type, output: originalName}, "output");
                if (translatedName !== originalName) {
                    output._name = translatedName;
                }
            }
        }
    }
}

// 更新所有节点
function updateAllNodes() {
    const nodes = app.graph._nodes;
    if (!nodes) return;
    
    for (const node of nodes) {
        applyNodeDisplayName(node);
        applyNodeCategory(node);
        applyInputLabels(node);
        applyOutputLabels(node);
        
        // 强制重绘节点
        node.setDirtyCanvas(true, true);
    }
}

// 监听语言更改事件
document.addEventListener("wr_pocket_tk_language_changed", () => {
    updateAllNodes();
});

// 注册扩展
app.registerExtension({
    name: "WR_Pocket_TK.I18n",
    async setup() {
        // 添加语言切换按钮
        addLanguageSwitcher();
    },
    async beforeRegisterNodeDef(nodeType, nodeData) {
        // 保存原始onNodeCreated函数
        const onNodeCreated = nodeType.prototype.onNodeCreated;
        
        // 重写onNodeCreated函数
        nodeType.prototype.onNodeCreated = function() {
            const result = onNodeCreated?.apply(this, arguments);
            
            // 如果节点属于我们的插件，应用翻译
            if (this.category === "🍉WR_Pocket_TK") {
                applyNodeDisplayName(this);
                applyNodeCategory(this);
                applyInputLabels(this);
                applyOutputLabels(this);
            }
            
            return result;
        };
    }
});

export { getTranslation, switchLanguage, currentLanguage }; 