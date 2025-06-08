import time
import torch
import numpy as np
import cv2
import os
import sys
import folder_paths
import base64
import io
import traceback
try:
    import torchvision.transforms.v2 as T
except ImportError:
    import torchvision.transforms as T
from aiohttp import web
from PIL import Image, ImageOps
from io import BytesIO
from threading import Event
from server import PromptServer
routes = PromptServer.instance.routes

class AlwaysEqualProxy(str):
    def __eq__(self, _):
        return True

    def __ne__(self, _):
        return False
    
class AnyType(str):
    """用于表示任意类型的特殊类，在类型比较时总是返回相等"""
    def __eq__(self, _) -> bool:
        return True

    def __ne__(self, __value: object) -> bool:
        return False

any = AnyType("*") 