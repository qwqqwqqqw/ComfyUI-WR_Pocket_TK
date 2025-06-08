import math
import torch
import comfy.model_management
import re

radio_list = [
    "SDXL - 1:1 square 1024x1024",
    "SDXL - 2:3 portrait 832x1216",
    "SDXL - 3:4 portrait 896x1152",
    "SDXL - 5:8 portrait 768x1216",
    "SDXL - 9:16 portrait 768x1344",
    "SDXL - 9:19 portrait 704x1472",
    "SDXL - 9:21 portrait 640x1536",
    "SD1.5 - 1:1 square 512x512",
    "SD1.5 - 2:3 portrait 512x768",
    "SD1.5 - 3:4 portrait 512x682",
    "SD1.5 - 16:9 cinema 910x512",
    "SD1.5 - 1.85:1 cinema 952x512",
    "SD1.5 - 2:1 cinema 1024x512",
]

class CustomLatentImageSimpleNode:
    """尺寸比例预设-WPTK"""
    @classmethod
    def INPUT_TYPES(self):
        return {
            "required": {
                "radio": (
                    radio_list,
                    {"default": "SDXL - 2:3 portrait 832x1216"},
                ),
                "switch_width_height": (
                    "BOOLEAN",
                    {"default": False, "label_on": "横构图", "label_off": "竖构图"},
                ),
                "batch_size": (
                    "INT",
                    {"default": 1, "min": 1, "max": 100},
                ),
            }
        }

    RETURN_TYPES = ("LATENT",)
    RETURN_NAMES = ("LATENT",)
    FUNCTION = "run"
    CATEGORY = "🍉WR_Pocket_TK"

    def run(self, radio, switch_width_height, batch_size):
        extracted = re.findall(r"(\d+)x(\d+)$", radio)
        width = int(extracted[0][0])
        height = int(extracted[0][1])
        if switch_width_height:
            (width, height) = (height, width)

        latent = torch.zeros(
            [batch_size, 4, height // 8, width // 8],
            device=comfy.model_management.intermediate_device(),
        )
        return {"result": ({"samples": latent},)}

# 添加节点映射
NODE_CLASS_MAPPINGS = {
    "CustomLatentImageSimpleNode": CustomLatentImageSimpleNode,
}

# 添加显示名称映射
NODE_DISPLAY_NAME_MAPPINGS = {
    "CustomLatentImageSimpleNode": "尺寸比例预设-WPTK",
} 