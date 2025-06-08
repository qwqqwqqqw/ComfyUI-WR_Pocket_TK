import torch
import math

class CommonValuesNode:
    """常用值坞-WPTK"""
    CATEGORY = "🍉WR_Pocket_TK"
    
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "active_value": (["A", "B", "C"], {"default": "A"}),
                "value_A": ("FLOAT", {"default": 1.0, "min": 0.0, "max": 255.0, "step": 0.01}),
                "value_B": ("FLOAT", {"default": 2.0, "min": 0.0, "max": 255.0, "step": 0.01}),
                "value_C": ("FLOAT", {"default": 3.0, "min": 0.0, "max": 255.0, "step": 0.01}),
            }
        }
    
    RETURN_TYPES = ("FLOAT", "INT")
    RETURN_NAMES = ("float_value", "int_value")
    FUNCTION = "get_values"
    
    def get_values(self, active_value, value_A, value_B, value_C):
        # 根据选择的值获取对应的数值
        if active_value == "A":
            selected_value = value_A
        elif active_value == "B":
            selected_value = value_B
        else:  # C
            selected_value = value_C
            
        # 浮点值直接输出，整数值四舍五入
        float_output = selected_value
        int_output = round(selected_value)
        
        return (float_output, int_output)

NODE_CLASS_MAPPINGS = {
    "CommonValuesNode": CommonValuesNode,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "CommonValuesNode": "常用值坞-WPTK",
} 