from .EVF import EVF
from .SizeManual import SizeManual
from .SizeAuto import SizeAuto
from .image_tools import CustomLatentImageSimpleNode
from .image_scaling import imageScaleToNormPixels
from .CommonValues import CommonValuesNode

NODE_CLASS_MAPPINGS = {
    "EVF": EVF,
    "SizeManual": SizeManual,
    "SizeAuto": SizeAuto,
    "CustomLatentImageSimpleNode": CustomLatentImageSimpleNode,
    "imageScaleToNormPixels": imageScaleToNormPixels,
    "CommonValuesNode": CommonValuesNode
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "EVF": "EVF取景器-WPTK",
    "SizeManual": "全画幅设置-WPTK",
    "SizeAuto": "尺寸自适应-WPTK",
    "CustomLatentImageSimpleNode": "尺寸比例预设-WPTK",
    "imageScaleToNormPixels": "图像标准像素缩放-WPTK",
    "CommonValuesNode": "常用值坞-WPTK"
} 