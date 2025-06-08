import importlib.util
import os
import sys
import json

NODE_CLASS_MAPPINGS = {}
NODE_DISPLAY_NAME_MAPPINGS = {}
WEB_DIRECTORY = "web"
python = sys.executable

def get_ext_dir(subpath=None, mkdir=False):
    dir = os.path.dirname(__file__)
    if subpath is not None:
        dir = os.path.join(dir, subpath)

    dir = os.path.abspath(dir)

    if mkdir and not os.path.exists(dir):
        os.makedirs(dir)
    return dir

def serialize(obj):
    if isinstance(obj, (str, int, float, bool, list, dict, type(None))):
        return obj
    return str(obj)  # 转为字符串

# 语言本地化支持
def load_locales():
    locale_dir = get_ext_dir("locales")
    locales = {}
    
    if os.path.exists(locale_dir):
        for lang in os.listdir(locale_dir):
            lang_path = os.path.join(locale_dir, lang)
            if os.path.isdir(lang_path):
                lang_data = {}
                
                # 加载main.json
                main_json_path = os.path.join(lang_path, "main.json")
                if os.path.exists(main_json_path):
                    with open(main_json_path, 'r', encoding='utf-8') as f:
                        main_data = json.load(f)
                        lang_data.update(main_data)
                
                # 加载nodeDefs.json
                nodedefs_json_path = os.path.join(lang_path, "nodeDefs.json")
                if os.path.exists(nodedefs_json_path):
                    with open(nodedefs_json_path, 'r', encoding='utf-8') as f:
                        nodedefs_data = json.load(f)
                        if "nodeDefs" not in lang_data:
                            lang_data["nodeDefs"] = {}
                        lang_data["nodeDefs"] = nodedefs_data
                
                locales[lang] = lang_data
    
    return locales

# 加载本地化数据
locale_data = load_locales()

nodes_dir = get_ext_dir("nodes")
files = os.listdir(nodes_dir)
all_nodes = {}
for file in files:
    if not file.endswith(".py"):
        continue
    name = os.path.splitext(file)[0]
    imported_module = importlib.import_module(".nodes.{}".format(name), __name__)
    try:
        NODE_CLASS_MAPPINGS = {**NODE_CLASS_MAPPINGS, **imported_module.NODE_CLASS_MAPPINGS}
        NODE_DISPLAY_NAME_MAPPINGS = {**NODE_DISPLAY_NAME_MAPPINGS, **imported_module.NODE_DISPLAY_NAME_MAPPINGS}
        serialized_CLASS_MAPPINGS = {k: serialize(v) for k, v in imported_module.NODE_CLASS_MAPPINGS.items()}
        serialized_DISPLAY_NAME_MAPPINGS = {k: serialize(v) for k, v in imported_module.NODE_DISPLAY_NAME_MAPPINGS.items()}
        all_nodes[file]={"NODE_CLASS_MAPPINGS": serialized_CLASS_MAPPINGS, "NODE_DISPLAY_NAME_MAPPINGS": serialized_DISPLAY_NAME_MAPPINGS}
    except:
        pass

try:
    # 创建web/js文件夹
    js_dir = get_ext_dir(os.path.join(WEB_DIRECTORY, "js"), mkdir=True)

    # 生成本地化JS文件
    locale_js_path = os.path.join(js_dir, "locales.js")
    with open(locale_js_path, 'w', encoding='utf-8') as f:
        f.write(f"export const locales = {json.dumps(locale_data, ensure_ascii=False)};")
except Exception as e:
    print(f"生成本地化文件时出错: {str(e)}")

__all__ = ["NODE_CLASS_MAPPINGS", "NODE_DISPLAY_NAME_MAPPINGS", "WEB_DIRECTORY"]
