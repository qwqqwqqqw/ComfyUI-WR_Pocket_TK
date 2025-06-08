import torch
import math
import numpy as np
from fractions import Fraction

class SizeAuto:
    """尺寸自适应-WPTK"""
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "image": ("IMAGE",),
            },
        }

    RETURN_TYPES = ("IMAGE",)
    FUNCTION = "resize"
    CATEGORY = "🍉WR_Pocket_TK"

    def is_simple_ratio(self, w, h, max_val=8):
        ratio = Fraction(w).limit_denominator(max_val) / \
                Fraction(h).limit_denominator(max_val)
        return ratio.numerator <= max_val and ratio.denominator <= max_val

    def resize(self, image):
        # 第一步：确保长宽能被8整除
        B, H, W, C = image.shape
        H_new = H - (H % 8)
        W_new = W - (W % 8)
        
        # 目标面积
        target_area = 1048576
        
        if self.is_simple_ratio(W_new, H_new):
            # 简单比例模式：严格保持≤8的整数比例（如47:20、37:20、9:21）
            original_ratio = Fraction(W_new).limit_denominator(8) / \
                            Fraction(H_new).limit_denominator(8)
            
            ideal_W = math.sqrt(target_area * float(original_ratio))
            ideal_H = math.sqrt(target_area / float(original_ratio))
            
            new_W = int(round(ideal_W / 8)) * 8
            new_H = int(round(ideal_H / 8)) * 8
        else:
            # 复杂比例模式：五千分之一精度
            original_ratio = np.float64(W_new) / np.float64(H_new)
            ideal_W = math.sqrt(target_area * original_ratio)
            ideal_H = math.sqrt(target_area / original_ratio)
            
            candidates = []
            base_W = int(round(ideal_W / 8)) * 8
            base_H = int(round(ideal_H / 8)) * 8
            
            for dw in range(-24, 25, 8):
                for dh in range(-24, 25, 8):
                    test_W = base_W + dw
                    test_H = base_H + dh
                    if test_W > 0 and test_H > 0:
                        test_ratio = np.float64(test_W) / np.float64(test_H)
                        ratio_diff = abs(test_ratio - original_ratio) / original_ratio
                        if ratio_diff < 0.0002:
                            area_diff = abs(test_W * test_H - target_area)
                            candidates.append((area_diff, ratio_diff, test_W, test_H))
            
            if candidates:
                candidates.sort(key=lambda x: (x[1], x[0]))
                _, _, new_W, new_H = candidates[0]
            else:
                scale_factor = math.sqrt(target_area / (W_new * H_new))
                new_W = int(round(W_new * scale_factor / 8)) * 8
                new_H = int(round(H_new * scale_factor / 8)) * 8
        
        # 最终面积校验
        if new_W * new_H > target_area:
            scale_factor = math.sqrt(target_area / (new_W * new_H))
            new_W = int(math.floor(new_W * scale_factor / 8)) * 8
            new_H = int(math.floor(new_H * scale_factor / 8)) * 8
        
        # 图像处理（最小裁切+最大比例保持）
        if new_H != H_new or new_W != W_new:
            # 计算最小缩放系数（保持原始比例）
            scale = min(new_W / W_new, new_H / H_new)
            scaled_W = int(W_new * scale)
            scaled_H = int(H_new * scale)
            
            # 高质量缩放（bicubic插值）
            scaled = torch.nn.functional.interpolate(
                image.permute(0, 3, 1, 2),
                size=(scaled_H, scaled_W),
                mode='bicubic',
                align_corners=False
            ).permute(0, 2, 3, 1)
            
            # 计算最小必要裁切区域（居中裁切）
            crop_h = max(0, scaled_H - new_H) // 2
            crop_w = max(0, scaled_W - new_W) // 2
            
            # 最终裁切
            result = scaled[:, crop_h:crop_h+new_H, crop_w:crop_w+new_W, :]
            
            # 确保最终输出的图像长宽都是8的倍数
            B, H, W, C = result.shape
            if H % 8 != 0 or W % 8 != 0:
                H_new = H - (H % 8)
                W_new = W - (W % 8)
                
                # 居中裁切到8的倍数
                crop_h = (H - H_new) // 2
                crop_w = (W - W_new) // 2
                
                result = result[:, crop_h:crop_h+H_new, crop_w:crop_w+W_new, :]
            
            return (result,)
        else:
            # 确保原始图像也符合要求
            B, H, W, C = image.shape
            if H % 8 != 0 or W % 8 != 0:
                H_new = H - (H % 8)
                W_new = W - (W % 8)
                
                # 居中裁切到8的倍数
                crop_h = (H - H_new) // 2
                crop_w = (W - W_new) // 2
                
                image = image[:, crop_h:crop_h+H_new, crop_w:crop_w+W_new, :]
            
            return (image,)

NODE_CLASS_MAPPINGS = {
    "SizeAuto": SizeAuto,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "SizeAuto": "尺寸自适应-WPTK",
} 