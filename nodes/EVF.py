from .md import *
size_data = {}

# 同步方法的静默日志装饰器
def silent_logger_sync(func):
    """
    同步方法的装饰器：抑制函数中的日志输出
    对于预览和调整操作，我们不希望在ComfyUI日志窗口中显示过多的调试信息
    """
    import io
    import sys
    from functools import wraps
    
    @wraps(func)
    def wrapper(*args, **kwargs):
        # 保存原始stdout
        original_stdout = sys.stdout
        
        # 创建一个空的输出缓冲区
        temp_stdout = io.StringIO()
        
        try:
            # 重定向stdout到临时缓冲区
            sys.stdout = temp_stdout
            
            # 调用原始函数
            result = func(*args, **kwargs)
            
            # 检查输出中是否有严重错误，如果有则打印
            log_output = temp_stdout.getvalue()
            
            # 只打印真正的错误信息，完全忽略常规操作日志
            if "错误" in log_output or "Error" in log_output or "Exception" in log_output:
                # 排除常规操作日志
                error_lines = [
                    line for line in log_output.split('\n') 
                    if ("错误" in line or "Error" in line or "Exception" in line) and not (
                        "接收到裁剪图像请求" in line or 
                        "节点数据不存在" in line or
                        "从前端接收到的参数" in line or
                        "当前节点状态" in line or
                        "更新后节点状态" in line or
                        "原始图像形状" in line or
                        "预览图像尺寸" in line or
                        "向前端发送图像预览更新" in line or
                        "等待前端处理完成" in line or
                        "处理取景框图像" in line or
                        "处理安全框图像" in line or
                        "EVF节点调整" in line
                    )
                ]
                if error_lines:
                    print("EVF节点出现错误:", file=original_stdout)
                    for line in error_lines:
                        print(line, file=original_stdout)
            
            return result
        
        finally:
            # 恢复原始stdout
            sys.stdout = original_stdout
    
    return wrapper

# 异步方法的静默日志装饰器
def silent_logger_async(func):
    """
    异步方法的装饰器：抑制函数中的日志输出
    对于预览和调整操作，我们不希望在ComfyUI日志窗口中显示过多的调试信息
    """
    import io
    import sys
    from functools import wraps
    
    @wraps(func)
    async def wrapper(*args, **kwargs):
        # 保存原始stdout
        original_stdout = sys.stdout
        
        # 创建一个空的输出缓冲区
        temp_stdout = io.StringIO()
        
        try:
            # 重定向stdout到临时缓冲区
            sys.stdout = temp_stdout
            
            # 调用原始函数
            result = await func(*args, **kwargs)
            
            # 检查输出中是否有严重错误，如果有则打印
            log_output = temp_stdout.getvalue()
            
            # 只打印真正的错误信息，完全忽略常规操作日志
            if "错误" in log_output or "Error" in log_output or "Exception" in log_output:
                # 排除常规操作日志
                error_lines = [
                    line for line in log_output.split('\n') 
                    if ("错误" in line or "Error" in line or "Exception" in line) and not (
                        "接收到裁剪图像请求" in line or 
                        "节点数据不存在" in line or
                        "从前端接收到的参数" in line or
                        "当前节点状态" in line or
                        "更新后节点状态" in line or
                        "原始图像形状" in line or
                        "预览图像尺寸" in line or
                        "向前端发送图像预览更新" in line or
                        "等待前端处理完成" in line or
                        "处理取景框图像" in line or
                        "处理安全框图像" in line or
                        "EVF节点调整" in line
                    )
                ]
                if error_lines:
                    print("EVF节点出现错误:", file=original_stdout)
                    for line in error_lines:
                        print(line, file=original_stdout)
            
            return result
        
        finally:
            # 恢复原始stdout
            sys.stdout = original_stdout
    
    return wrapper

class EVF:
    """EVF取景器-WPTK"""
    
    @classmethod
    def INPUT_TYPES(cls):
        return {
            "required": {
                "reset": ("BOOLEAN", {"default": False, "label": "Reset复位"}),
                "source_size": ("BOOLEAN", {"default": False, "label_on": "Source Size 源尺寸输出", "label_off": "Latent尺寸输出"}),
                "image": ("IMAGE",),
                "latent": ("LATENT", {"default": None, "label": "Latent(裁切比例)"}),
                "horizontal_flip": ("BOOLEAN", {"default": False, "label_on": "Horizontal 水平翻转", "label_off": "Horizontal 水平翻转"}),
                "vertical_flip": ("BOOLEAN", {"default": False, "label_on": "Vertical 垂直翻转", "label_off": "Vertical 垂直翻转"}),
                "rotation_angle": ("FLOAT", {"default": 0, "min": -180, "max": 180, "step": 1, "display": "slider", "precision": 1, "label": "Rotation Angle 旋转角度"}),
            },
            "hidden": {
                "unique_id": "UNIQUE_ID",
                "zoom": ("FLOAT", {"default": 0}),
                "pan_x": ("FLOAT", {"default": 0}),
                "pan_y": ("FLOAT", {"default": 0}),
            }
        }

    RETURN_TYPES = ("IMAGE", "IMAGE")
    RETURN_NAMES = ("Viewfinder 取景框图像", "SafeFrame 安全框图像")
    FUNCTION = "adjust"
    CATEGORY = "🍉WR_Pocket_TK"
    OUTPUT_NODE = True

    @silent_logger_sync
    def adjust(self, image, reset, source_size, latent, horizontal_flip, vertical_flip, rotation_angle, unique_id):
        try:
            node_id = unique_id
            # 从隐藏输入中获取默认值
            zoom = 0
            pan_x = 0
            pan_y = 0
            
            # 如果复位按钮被点击，重置所有参数
            if reset:
                horizontal_flip = False
                vertical_flip = False
                rotation_angle = 0
                zoom = 0
                pan_x = 0
                pan_y = 0
            
            # 确保清理可能存在的旧数据
            if node_id in size_data:
                del size_data[node_id]
            
            # 从latent提取裁切比例
            aspect_ratio = None
            if latent is not None and "samples" in latent:
                try:
                    # 获取latent的宽高比
                    latent_shape = latent["samples"].shape
                    if len(latent_shape) >= 3:
                        aspect_ratio = latent_shape[3] / latent_shape[2]  # width / height
                except Exception as e:
                    print(f"提取latent比例出错: {e}")
                    pass
            
            event = Event()
            size_data[node_id] = {
                "event": event,
                "result": None,
                "result_safe": None,
                "horizontal_flip": horizontal_flip,
                "vertical_flip": vertical_flip,
                "rotation_angle": rotation_angle,
                "zoom": zoom,
                "pan_x": pan_x,
                "pan_y": pan_y,
                "aspect_ratio": aspect_ratio,
                "source_size": source_size,
                "latent": latent,
                "image": image,
                "original_state": {
                    "horizontal_flip": horizontal_flip,
                    "vertical_flip": vertical_flip,
                    "rotation_angle": rotation_angle,
                    "zoom": zoom,
                    "pan_x": pan_x,
                    "pan_y": pan_y
                }
            }
            
            # 直接使用原始图像，让前端处理所有变换
            # 这样可以确保前端和后端看到的图像完全一致
            processed_image = image.clone()
            
            # 发送预览图像
            preview_image = (torch.clamp(processed_image.clone(), 0, 1) * 255).cpu().numpy().astype(np.uint8)[0]
            pil_image = Image.fromarray(preview_image)
            
            buffer = io.BytesIO()
            pil_image.save(buffer, format="PNG")
            base64_image = base64.b64encode(buffer.getvalue()).decode('utf-8')
            
            try:
                # 向前端发送更新，包含翻转和旋转的状态信息
                PromptServer.instance.send_sync("image_preview_update", {
                    "node_id": node_id,
                    "image_data": f"data:image/png;base64,{base64_image}",
                    "original_width": processed_image.shape[2],
                    "original_height": processed_image.shape[1],
                    "aspect_ratio": aspect_ratio,
                    "source_size": source_size,
                    "horizontal_flip": horizontal_flip,
                    "vertical_flip": vertical_flip,
                    "rotation_angle": rotation_angle,
                    "zoom": zoom,
                    "pan_x": pan_x,
                    "pan_y": pan_y,
                    "transform_mode": "original_axis"  # 指示前端使用原始轴向进行变换
                })
                
                # 等待前端调整完成
                if not event.wait(timeout=15):
                    print("等待前端超时，返回原始图像")
                    if node_id in size_data:
                        del size_data[node_id]
                    # 返回原始处理图像作为两个输出
                    return (processed_image, processed_image)

                result_image = size_data[node_id].get("result")
                result_safe_image = size_data[node_id].get("result_safe")
                
                # 如果没有接收到裁切结果，返回原始处理图像
                if result_image is None:
                    print("未收到取景框结果，使用原始图像")
                    result_image = processed_image
                else:
                    pass
                    
                if result_safe_image is None:
                    print("未收到安全框结果，使用原始图像")
                    result_safe_image = processed_image
                else:
                    pass
                
                # 清理数据
                del size_data[node_id]
                    
                # 确保返回的图像具有正确的形状 [B, H, W, C]
                if len(result_image.shape) != 4:
                    result_image = result_image.unsqueeze(0)
                if len(result_safe_image.shape) != 4:
                    result_safe_image = result_safe_image.unsqueeze(0)
                
                return (result_image, result_safe_image)
                
            except Exception as e:
                print(f"处理过程出错: {e}")
                import traceback
                print(traceback.format_exc())
                if node_id in size_data:
                    del size_data[node_id]
                return (processed_image, processed_image)
            
        except Exception as e:
            print(f"adjust方法整体出错: {e}")
            import traceback
            print(traceback.format_exc())
            if node_id in size_data:
                del size_data[node_id]
            return (image, image)

@silent_logger_async
@PromptServer.instance.routes.post("/image_preview/apply")
async def apply_image_preview(request):
    try:
        # print("接收到裁剪图像请求...")
        # 检查内容类型
        content_type = request.headers.get('Content-Type', '')
        
        if 'multipart/form-data' in content_type:
            # 处理multipart/form-data请求
            reader = await request.multipart()
            
            # 读取表单字段
            node_id = None
            new_width = None
            new_height = None
            image_data = None
            image_safe_data = None
            source_size = None
            horizontal_flip = None
            vertical_flip = None
            rotation_angle = None
            zoom = None
            pan_x = None
            pan_y = None
            
            # 逐个处理表单字段
            while True:
                part = await reader.next()
                if part is None:
                    break
                    
                if part.name == 'node_id':
                    node_id = await part.text()
                elif part.name == 'width':
                    new_width = int(await part.text())
                elif part.name == 'height':
                    new_height = int(await part.text())
                elif part.name == 'source_size':
                    source_size = (await part.text()) == 'true'
                elif part.name == 'horizontal_flip':
                    horizontal_flip = (await part.text()) == 'true'
                elif part.name == 'vertical_flip':
                    vertical_flip = (await part.text()) == 'true'
                elif part.name == 'rotation_angle':
                    rotation_angle = float(await part.text())
                elif part.name == 'zoom':
                    zoom = float(await part.text())
                elif part.name == 'pan_x':
                    pan_x = float(await part.text())
                elif part.name == 'pan_y':
                    pan_y = float(await part.text())
                elif part.name == 'image_data':
                    # 读取二进制图像数据
                    image_data = await part.read(decode=False)
                elif part.name == 'image_safe_data':
                    # 读取二进制安全框图像数据
                    image_safe_data = await part.read(decode=False)
            
            # print(f"从前端接收到的参数: width={new_width}, height={new_height}, " +
            #      f"horizontal_flip={horizontal_flip}, vertical_flip={vertical_flip}, " +
            #      f"rotation_angle={rotation_angle}, zoom={zoom}, " +
            #      f"pan_x={pan_x}, pan_y={pan_y}, source_size={source_size}")
                 
        else:
            # 处理JSON请求
            data = await request.json()
            node_id = data.get("node_id")
            new_width = data.get("width")
            new_height = data.get("height")
            source_size = data.get("source_size", False)
            horizontal_flip = data.get("horizontal_flip", None)
            vertical_flip = data.get("vertical_flip", None)
            rotation_angle = data.get("rotation_angle", None)
            zoom = data.get("zoom", None)
            pan_x = data.get("pan_x", None)
            pan_y = data.get("pan_y", None)
            image_data = None
            image_safe_data = None
            
            # 检查是否有base64编码的图像数据
            adjusted_data_base64 = data.get("adjusted_data_base64")
            if adjusted_data_base64:
                if adjusted_data_base64.startswith('data:image'):
                    base64_data = adjusted_data_base64.split(',')[1]
                else:
                    base64_data = adjusted_data_base64
                image_data = base64.b64decode(base64_data)
                
            # 检查是否有base64编码的安全框图像数据
            adjusted_safe_data_base64 = data.get("adjusted_safe_data_base64")
            if adjusted_safe_data_base64:
                if adjusted_safe_data_base64.startswith('data:image'):
                    base64_data = adjusted_safe_data_base64.split(',')[1]
                else:
                    base64_data = adjusted_safe_data_base64
                image_safe_data = base64.b64decode(base64_data)
        
        if node_id not in size_data:
            # print(f"节点数据不存在: {node_id}")
            return web.json_response({"success": False, "error": "节点数据不存在"})
        
        try:
            node_info = size_data[node_id]
            
            # 输出当前节点状态
            # print(f"当前节点状态: horizontal_flip={node_info.get('horizontal_flip')}, " +
            #      f"vertical_flip={node_info.get('vertical_flip')}, " +
            #      f"rotation_angle={node_info.get('rotation_angle')}, " +
            #      f"zoom={node_info.get('zoom', 0)}, " +
            #      f"pan_x={node_info.get('pan_x', 0)}, " +
            #      f"pan_y={node_info.get('pan_y', 0)}")
            
            # 更新节点信息中的翻转和旋转状态（如果前端提供了）
            # 这些状态始终基于原始轴向(OX和OY)
            if horizontal_flip is not None:
                node_info["horizontal_flip"] = horizontal_flip
                node_info["original_state"]["horizontal_flip"] = horizontal_flip
            if vertical_flip is not None:
                node_info["vertical_flip"] = vertical_flip
                node_info["original_state"]["vertical_flip"] = vertical_flip
            if rotation_angle is not None:
                node_info["rotation_angle"] = rotation_angle
                node_info["original_state"]["rotation_angle"] = rotation_angle
            if zoom is not None:
                node_info["zoom"] = zoom
                node_info["original_state"]["zoom"] = zoom
            if pan_x is not None:
                node_info["pan_x"] = pan_x
                node_info["original_state"]["pan_x"] = pan_x
            if pan_y is not None:
                node_info["pan_y"] = pan_y
                node_info["original_state"]["pan_y"] = pan_y
                
            # print(f"更新后节点状态: horizontal_flip={node_info.get('horizontal_flip')}, " +
            #      f"vertical_flip={node_info.get('vertical_flip')}, " +
            #      f"rotation_angle={node_info.get('rotation_angle')}, " +
            #      f"zoom={node_info.get('zoom', 0)}, " +
            #      f"pan_x={node_info.get('pan_x', 0)}, " +
            #      f"pan_y={node_info.get('pan_y', 0)}")
            
            # 第一步：处理取景框图像(B框)
            viewfinder_tensor = None
            if image_data:
                try:
                    # print("处理取景框图像...")
                    # 从二进制数据创建PIL图像
                    buffer = io.BytesIO(image_data)
                    pil_image = Image.open(buffer)
                    
                    # print(f"接收到的取景框图像尺寸: {pil_image.width}x{pil_image.height}")
                    
                    # 记录原始尺寸，供安全框使用
                    viewfinder_orig_width = pil_image.width
                    viewfinder_orig_height = pil_image.height
                    
                    # 转换为RGB模式（如果是RGBA）
                    if pil_image.mode == 'RGBA':
                        # 使用#272727作为背景色
                        background = Image.new('RGB', pil_image.size, (39, 39, 39))
                        background.paste(pil_image, mask=pil_image.split()[3])  # 使用alpha通道作为mask
                        pil_image = background
                    elif pil_image.mode != 'RGB':
                        pil_image = pil_image.convert('RGB')
                    
                    # 检查是否需要调整尺寸到latent尺寸
                    if not source_size and node_info.get("latent") is not None and "samples" in node_info["latent"]:
                        try:
                            latent = node_info["latent"]
                            latent_width = latent["samples"].shape[3] * 8
                            latent_height = latent["samples"].shape[2] * 8
                            
                            # print(f"将调整到latent尺寸: {latent_width}x{latent_height}")
                            
                            # 调整图像尺寸
                            pil_image = pil_image.resize((latent_width, latent_height), Image.LANCZOS)
                            # print(f"调整后尺寸: {pil_image.width}x{pil_image.height}")
                        except Exception as e:
                            print(f"调整尺寸到latent尺寸出错: {e}")
                            pass
                    
                    # 转换为numpy数组 - 直接使用前端传来的图像，不再进行额外变换
                    np_image = np.array(pil_image)
                    # print(f"取景框numpy数组形状: {np_image.shape}")
                    
                    # 检查numpy数组有效性
                    is_valid = np.max(np_image) > 10  # 检查是否有非黑色像素
                    # print(f"取景框图像有效性检查: {is_valid}, 最大值: {np.max(np_image)}")
                    
                    # 转换为PyTorch张量 - 使用正确的维度顺序 [B, H, W, C]
                    viewfinder_tensor = torch.from_numpy(np_image / 255.0).float().unsqueeze(0)
                    # print(f"取景框张量形状: {viewfinder_tensor.shape}")
                    node_info["result"] = viewfinder_tensor
                    node_info["viewfinder_orig_width"] = viewfinder_orig_width
                    node_info["viewfinder_orig_height"] = viewfinder_orig_height
                except Exception as e:
                    print(f"处理取景框图像出错: {e}")
                    import traceback
                    print(traceback.format_exc())
                    pass
                    
            # 第二步：处理安全框图像(C框)
            if image_safe_data:
                try:
                    # print("处理安全框图像...")
                    # 从二进制数据创建PIL图像
                    buffer = io.BytesIO(image_safe_data)
                    pil_image = Image.open(buffer)
                    
                    # print(f"接收到的安全框图像尺寸: {pil_image.width}x{pil_image.height}")
                    
                    # 记录原始尺寸，以便计算比例
                    safe_orig_width = pil_image.width
                    safe_orig_height = pil_image.height
                    
                    # 转换为RGB模式（如果是RGBA）
                    if pil_image.mode == 'RGBA':
                        # 使用#272727作为背景色
                        background = Image.new('RGB', pil_image.size, (39, 39, 39))
                        background.paste(pil_image, mask=pil_image.split()[3])  # 使用alpha通道作为mask
                        pil_image = background
                    elif pil_image.mode != 'RGB':
                        pil_image = pil_image.convert('RGB')
                    
                    # 检查是否需要调整尺寸到latent尺寸
                    if not source_size and node_info.get("latent") is not None and "samples" in node_info["latent"]:
                        try:
                            latent = node_info["latent"]
                            latent_width = latent["samples"].shape[3] * 8
                            latent_height = latent["samples"].shape[2] * 8
                            
                            # 检查是否有取景框原始尺寸信息，计算相对比例
                            if "viewfinder_orig_width" in node_info and "viewfinder_orig_height" in node_info:
                                viewfinder_orig_width = node_info["viewfinder_orig_width"]
                                viewfinder_orig_height = node_info["viewfinder_orig_height"]
                                
                                # 计算比例
                                width_ratio = safe_orig_width / viewfinder_orig_width
                                height_ratio = safe_orig_height / viewfinder_orig_height
                                
                                # 应用比例到latent尺寸
                                target_width = int(latent_width * width_ratio)
                                target_height = int(latent_height * height_ratio)
                                
                                # print(f"将安全框调整到比例尺寸: {target_width}x{target_height}")
                                
                                # 调整图像尺寸
                                pil_image = pil_image.resize((target_width, target_height), Image.LANCZOS)
                            else:
                                # 如果没有取景框信息，直接调整到latent尺寸
                                # print(f"将安全框直接调整到latent尺寸: {latent_width}x{latent_height}")
                                pil_image = pil_image.resize((latent_width, latent_height), Image.LANCZOS)
                                
                            # print(f"安全框调整后尺寸: {pil_image.width}x{pil_image.height}")
                        except Exception as e:
                            print(f"调整安全框尺寸出错: {e}")
                            pass
                    
                    # 转换为numpy数组 - 直接使用前端传来的图像，不再进行额外变换
                    np_image = np.array(pil_image)
                    # print(f"安全框numpy数组形状: {np_image.shape}")
                    
                    # 检查numpy数组有效性
                    is_valid = np.max(np_image) > 10  # 检查是否有非黑色像素
                    # print(f"安全框图像有效性检查: {is_valid}, 最大值: {np.max(np_image)}")
                    
                    # 转换为PyTorch张量 - 使用正确的维度顺序 [B, H, W, C]
                    tensor_image = torch.from_numpy(np_image / 255.0).float().unsqueeze(0)
                    # print(f"安全框张量形状: {tensor_image.shape}")
                    node_info["result_safe"] = tensor_image
                except Exception as e:
                    print(f"处理安全框图像出错: {e}")
                    import traceback
                    print(traceback.format_exc())
                    pass
            
            # 在成功处理后添加标记
            node_info["processed"] = True
            node_info["event"].set()
            # print("裁剪处理完成，返回成功")
            return web.json_response({"success": True})
            
        except Exception as e:
            # 使用traceback.format_exc()而不是print
            print(f"处理请求出错: {e}")
            import traceback
            print(traceback.format_exc())
            if node_id in size_data and "event" in size_data[node_id]:
                size_data[node_id]["event"].set()
            return web.json_response({"success": False, "error": str(e)})

    except Exception as e:
        # 使用traceback.format_exc()而不是print
        print(f"处理请求出错: {e}")
        import traceback
        print(traceback.format_exc())
        return web.json_response({"success": False, "error": str(e)})
    
NODE_CLASS_MAPPINGS = {
    "EVF": EVF,
}

NODE_DISPLAY_NAME_MAPPINGS = {
    "EVF": "EVF取景器-WPTK",
} 