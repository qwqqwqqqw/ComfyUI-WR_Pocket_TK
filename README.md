
![未标题-2_0](https://github.com/user-attachments/assets/6bb15f57-4d6c-4d29-90db-8c72cb863b5b)

![未标题-2_1](https://github.com/user-attachments/assets/933a8851-c344-420c-a192-2187a3845712)


# ComfyUI-WR_Pocket_TK

ComfyUI-WR_Pocket_TK是一个图像处理工具集，提供了几个图像类节点。

ComfyUI-WR_Pocket_TK is an image processing toolkit that provides several image-related nodes.

[English Version](#comfyui-wr_pocket_tk-english-version) |

![测试流](https://github.com/user-attachments/assets/49eb77c1-2d12-42bf-a0ad-c4cb32e358c5)


## 主要功能

### EVF取景器节点

EVF取景器是一个强大的图像预览和裁剪调整节点，具有以下功能：

- **实时预览**: 在ComfyUI界面中直接预览图像调整效果
- **图像变换**: 支持水平翻转、垂直翻转、旋转角度调整
- **缩放与平移**: 通过鼠标交互实现图像的缩放和平移
- **裁剪比例控制**: 通过Latent输入控制裁剪比例
- **尺寸选择**: 可选择输出源尺寸或Latent尺寸
- **单节点预调**: 支持单独执行节点进行预览调整，无需执行整个工作流
- **复位功能**: 一键重置所有调整参数到默认状态

### 全画幅设置

提供全画幅摄影常用尺寸预设，支持以下功能：

- **预设尺寸选择**: 包含多种常用的全画幅尺寸比例，如1024x1536, 2048x3072等
- **横竖构图切换**: 可一键切换横构图和竖构图模式
- **适配AI模型**: 所有尺寸都是8的倍数，适合各种AI模型处理

### 尺寸自适应

自动调整图像尺寸的实用工具，具有以下特点：

- **比例保持**: 自动计算并保持原始图像比例，精度可达五千分之一
- **面积优化**: 优化输出图像面积，目标面积约为1048576像素
- **最小裁切**: 使用最小必要裁切，保留最多的图像内容
- **智能比例处理**: 区分简单比例和复杂比例，采用不同的处理策略
- **高质量缩放**: 使用bicubic插值算法确保图像质量

### 尺寸比例预设

提供常用的潜空间尺寸预设，适用于各种AI模型：

- **多种预设**: 包含SDXL和SD1.5的多种常用尺寸比例
- **横竖构图切换**: 支持一键切换横构图和竖构图
- **批量处理**: 支持设置批处理大小
- **模型适配**: 预设包含适合SDXL和SD1.5模型的常用尺寸

### 图像标准像素缩放

提供图像按特定标准进行缩放的功能：

- **可除性保证**: 确保缩放后的尺寸能被8或32整除
- **比例缩放**: 支持0.01-8.0倍的自由缩放
- **高质量插值**: 使用bicubic插值算法确保图像质量

### 常用值坞

提供便捷的常用数值选择功能：

- **多值切换**: 支持在A、B、C三组预设值之间快速切换
- **双输出格式**: 同时输出浮点值和整数值
- **范围控制**: 数值范围0-255，精确到小数点后两位
- **自动转换**: 整数值自动四舍五入，无需手动转换

## 技术栈

- **后端**: Python 3.x
  - OpenCV: 图像处理和变换
  - Torch/Torchvision: 张量操作和高质量图像变换
  - PIL (Pillow): 图像处理和格式转换
  - NumPy: 数值计算和数组操作
  - aiohttp: 异步HTTP服务器和客户端，实现前后端通信
  - fractions: 分数计算，用于比例精确处理
  
- **前端**: JavaScript
  - 自定义WebSocket通信: 实现前后端实时数据交换
  - 交互式图像编辑界面: 支持鼠标拖拽、缩放等操作
  - 实时预览更新: 无需刷新页面即可查看调整效果
  - 本地化支持: 多语言界面（中文/英文）

## 特色技术实现

- **静默日志系统**: 通过装饰器实现的日志控制系统，减少不必要的调试信息
- **实时交互**: 通过WebSocket实现前后端实时通信
- **单节点执行**: 无需执行整个工作流即可预览调整效果
- **复位功能**: 一键重置所有调整参数
- **多语言支持**: 通过locales文件夹中的JSON文件实现界面中英文切换
- **高精度比例计算**: 使用分数库实现精确的比例计算和保持

## 安装方法

1. 将此仓库克隆或下载到您的ComfyUI安装目录下的`custom_nodes`文件夹中：
   ```
   git clone https://github.com/qwqqwqqqw/ComfyUI-WR_Pocket_TK.git
   ```
   或者直接下载ZIP文件并解压到`custom_nodes`文件夹

2. 安装必要的依赖：
   ```
   pip install -r requirements.txt
   ```

3. 重启ComfyUI

## 使用方法

1. 在节点浏览器中找到"🍉WR_Pocket_TK"分类
2. 根据需要添加相应节点到您的工作流：
   - **EVF取景器-WPTK**: 用于图像预览和裁剪调整
   - **全画幅设置-WPTK**: 用于选择全画幅预设尺寸
   - **尺寸自适应-WPTK**: 用于自动调整图像尺寸
   - **尺寸比例预设-WPTK**: 用于创建预设尺寸的潜空间
   - **图像标准像素缩放-WPTK**: 用于按特定标准缩放图像
   - **常用值坞-WPTK**: 用于快速选择和切换常用数值
3. 连接节点并根据需要设置参数
4. 执行工作流或使用单节点预览功能

### EVF取景器使用技巧

1. 连接图像输入和可选的Latent输入
2. 使用鼠标直接在预览窗口中拖拽、缩放图像
3. 调整水平/垂直翻转和旋转角度参数
4. 选择是否使用源尺寸或Latent尺寸输出
5. 使用复位按钮一键重置所有调整

### 尺寸自适应使用技巧

1. 连接需要调整尺寸的图像
2. 节点会自动计算最佳输出尺寸，保持原始比例
3. 输出的图像尺寸会是8的倍数，适合AI模型处理

### 尺寸比例预设使用技巧

1. 选择预设尺寸（SDXL或SD1.5模型的常用尺寸）
2. 根据需要切换横构图/竖构图
3. 设置批处理大小
4. 输出的潜空间可直接连接到生成模型

### 全画幅设置使用技巧

1. 从预设列表中选择所需尺寸
2. 选择横构图或竖构图
3. 输出的宽度和高度值可以连接到其他需要尺寸参数的节点

### 常用值坞使用技巧

1. 设置三组不同的数值（A、B、C）
2. 在使用过程中快速切换所需的数值组
3. 可同时获取浮点输出和整数输出，连接到不同类型的参数

## 注意事项

- 所有图像或遮罩输入或输出使用B H W C或B H W形状的张量
- 节点分类为"🍉WR_Pocket_TK"
- 插件依赖于特定版本的Python库，请确保正确安装所有依赖
- 适用于ComfyUI的各种版本，支持Windows、Linux和macOS系统

## 本地化支持

此插件支持中英文双语界面：
- 中文界面显示本地化的节点名称和参数名称
- 英文界面提供国际化支持
- 通过locales文件夹中的JSON文件实现语言切换
- ComfyUI界面语言设置会自动应用到插件界面

## 项目维护

- 项目维护于GitHub: https://github.com/qwqqwqqqw/ComfyUI-WR_Pocket_TK
- 欢迎提交Issues和Pull Requests
- 定期更新以支持ComfyUI的最新版本

## 许可证

[MIT License] - 允许自由使用、修改和分发 

---

# ComfyUI-WR_Pocket_TK (English Version)

ComfyUI-WR_Pocket_TK is an image processing toolkit that provides several image-related nodes.

| [中文版本](#comfyui-wr_pocket_tk)

## Main Features

### EVF Viewfinder Node

The EVF Viewfinder is a powerful image preview and cropping adjustment node with the following features:

- **Live Preview**: Directly preview image adjustments in the ComfyUI interface
- **Image Transformations**: Support for horizontal flip, vertical flip, and rotation angle adjustment
- **Zoom and Pan**: Image zooming and panning through mouse interaction
- **Crop Ratio Control**: Control crop ratio through Latent input
- **Size Selection**: Choose between source size or Latent size output
- **Single Node Preview**: Support for previewing adjustments without executing the entire workflow
- **Reset Function**: One-click reset of all adjustment parameters to default state

### Full-Frame Settings

Provides common full-frame photography size presets with the following features:

- **Preset Size Selection**: Includes various common full-frame size ratios like 1024x1536, 2048x3072, etc.
- **Orientation Toggle**: One-click switch between landscape and portrait modes
- **AI Model Compatibility**: All sizes are multiples of 8, suitable for various AI models

### Size Adaptation

A utility tool for automatic image size adjustment with the following characteristics:

- **Ratio Preservation**: Automatically calculates and maintains original image ratio with precision up to 1/5000
- **Area Optimization**: Optimizes output image area, target area approximately 1,048,576 pixels
- **Minimal Cropping**: Uses minimal necessary cropping to preserve maximum image content
- **Smart Ratio Processing**: Different processing strategies for simple and complex ratios
- **High-Quality Scaling**: Uses bicubic interpolation algorithm to ensure image quality

### Size Ratio Presets

Provides common latent space size presets for various AI models:

- **Multiple Presets**: Includes various common size ratios for SDXL and SD1.5
- **Orientation Toggle**: Support for one-click switching between landscape and portrait
- **Batch Processing**: Support for setting batch size
- **Model Adaptation**: Presets include common sizes suitable for SDXL and SD1.5 models

### Standard Pixel Scaling

Provides image scaling functionality according to specific standards:

- **Divisibility Guarantee**: Ensures scaled dimensions are divisible by 8 or 32
- **Proportional Scaling**: Supports free scaling from 0.01x to 8.0x
- **High-Quality Interpolation**: Uses bicubic interpolation algorithm to ensure image quality

### Common Values Dock

Provides convenient common value selection functionality:

- **Multi-value Toggle**: Quick switching between A, B, C preset value groups
- **Dual Output Format**: Simultaneous output of float and integer values
- **Range Control**: Value range 0-255, precise to two decimal places
- **Automatic Conversion**: Integer values automatically rounded, no manual conversion needed

## Technical Stack

- **Backend**: Python 3.x
  - OpenCV: Image processing and transformations
  - Torch/Torchvision: Tensor operations and high-quality image transformations
  - PIL (Pillow): Image processing and format conversion
  - NumPy: Numerical computation and array operations
  - aiohttp: Asynchronous HTTP server and client for frontend-backend communication
  - fractions: Fraction calculation for precise ratio processing
  
- **Frontend**: JavaScript
  - Custom WebSocket Communication: Real-time data exchange between frontend and backend
  - Interactive Image Editing Interface: Support for mouse drag, zoom, and other operations
  - Real-time Preview Updates: View adjustment effects without page refresh
  - Localization Support: Multilingual interface (Chinese/English)

## Technical Features

- **Silent Logging System**: Log control system implemented through decorators, reducing unnecessary debug information
- **Real-time Interaction**: Real-time communication through WebSocket
- **Single Node Execution**: Preview adjustments without executing the entire workflow
- **Reset Function**: One-click reset of all adjustment parameters
- **Multilingual Support**: Interface language switching through JSON files in the locales folder
- **High-Precision Ratio Calculation**: Precise ratio calculation and maintenance using the fractions library

## Installation

1. Clone or download this repository to your ComfyUI installation directory's `custom_nodes` folder:
   ```
   git clone https://github.com/qwqqwqqqw/ComfyUI-WR_Pocket_TK.git
   ```
   Or download the ZIP file and extract it to the `custom_nodes` folder

2. Install required dependencies:
   ```
   pip install -r requirements.txt
   ```

3. Restart ComfyUI

## Usage

1. Find the "🍉WR_Pocket_TK" category in the node browser
2. Add the required nodes to your workflow:
   - **EVF Viewfinder-WPTK**: For image preview and cropping adjustment
   - **Full-Frame Settings-WPTK**: For selecting full-frame preset sizes
   - **Size Adaptation-WPTK**: For automatic image size adjustment
   - **Size Ratio Presets-WPTK**: For creating preset-sized latent spaces
   - **Standard Pixel Scaling-WPTK**: For scaling images according to specific standards
   - **Common Values Dock-WPTK**: For quick selection and switching of common values
3. Connect nodes and set parameters as needed
4. Execute the workflow or use single node preview function

### EVF Viewfinder Tips

1. Connect image input and optional Latent input
2. Use mouse to drag and zoom image directly in the preview window
3. Adjust horizontal/vertical flip and rotation angle parameters
4. Choose between source size or Latent size output
5. Use reset button to reset all adjustments

### Size Adaptation Tips

1. Connect the image that needs size adjustment
2. Node automatically calculates optimal output size while maintaining original ratio
3. Output image size will be a multiple of 8, suitable for AI model processing

### Size Ratio Presets Tips

1. Select preset size (common sizes for SDXL or SD1.5 models)
2. Switch between landscape/portrait as needed
3. Set batch size
4. Output latent space can be directly connected to generation models

### Full-Frame Settings Tips

1. Select desired size from preset list
2. Choose landscape or portrait orientation
3. Output width and height values can be connected to other nodes requiring size parameters

### Common Values Dock Tips

1. Set three different value groups (A, B, C)
2. Quickly switch between value groups during use
3. Get both float and integer outputs simultaneously, connect to different parameter types

## Notes

- All image or mask inputs/outputs use tensors of shape B H W C or B H W
- Node category is "🍉WR_Pocket_TK"
- Plugin depends on specific versions of Python libraries, ensure all dependencies are correctly installed
- Compatible with various versions of ComfyUI, supports Windows, Linux, and macOS systems

## Localization Support

This plugin supports bilingual interface (Chinese/English):
- Chinese interface displays localized node names and parameter names
- English interface provides internationalization support
- Language switching through JSON files in the locales folder
- ComfyUI interface language settings automatically apply to plugin interface

## Project Maintenance

- Project maintained on GitHub: https://github.com/qwqqwqqqw/ComfyUI-WR_Pocket_TK
- Issues and Pull Requests welcome
- Regular updates to support the latest version of ComfyUI

## License

[MIT License] - Free to use, modify, and distribute 
