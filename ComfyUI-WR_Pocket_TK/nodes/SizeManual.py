import torch
from torch import Tensor
from typing import Tuple, Optional

class SizeManual:
    """全画幅设置-WPTK"""
    CATEGORY = "🍉WR_Pocket_TK"

    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "size": (["1024x1536", "2048x3072", "2688x4032", "3392x5088", "4096x6144", "4032x6048", "4672x7008", "5376x8064"],),
                "swap_dimensions": ("BOOLEAN", {"default": False, "label_on": "横构图", "label_off": "竖构图"}),
            },
        }

    RETURN_TYPES = ("INT", "INT")
    RETURN_NAMES = ("width", "height")
    FUNCTION = "execute"

    def execute(self, size: str, swap_dimensions: bool) -> Tuple[int, int]:
        width, height = map(int, size.split("x"))
        if swap_dimensions:
            width, height = height, width
        return (width, height)

NODE_CLASS_MAPPINGS = {
    "SizeManual": SizeManual,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "SizeManual": "全画幅设置-WPTK",
} 