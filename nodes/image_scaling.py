import torch
import comfy.utils

class imageScaleToNormPixels:
    """图像标准像素缩放-WPTK"""
    
    @classmethod
    def INPUT_TYPES(s):
        return {
            "required": {
                "image": ("IMAGE",),
                "divisible_by": (["8", "32"], {"default": "8"}),
                "scale_by": ("FLOAT", {"default": 1.0, "min": 0.01, "max": 8.0, "step": 0.01}),
            }
        }

    RETURN_TYPES = ("IMAGE",)
    RETURN_NAMES = ("image",)
    FUNCTION = "scale"
    CATEGORY = "🍉WR_Pocket_TK"

    def scale(self, image, scale_by, divisible_by):
        height, width = image.shape[1:3]
        divisor = int(divisible_by)
        width = int(width * scale_by - width * scale_by % divisor)
        height = int(height * scale_by - height * scale_by % divisor)
        
        # 直接使用torch.nn.functional进行缩放
        scaled_image = torch.nn.functional.interpolate(
            image.permute(0, 3, 1, 2),  # [B, H, W, C] -> [B, C, H, W]
            size=(height, width),
            mode='bicubic',
            align_corners=False
        ).permute(0, 2, 3, 1)  # [B, C, H, W] -> [B, H, W, C]
        
        return (scaled_image,)

NODE_CLASS_MAPPINGS = {
    "imageScaleToNormPixels": imageScaleToNormPixels,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "imageScaleToNormPixels": "图像标准像素缩放-WPTK",
} 