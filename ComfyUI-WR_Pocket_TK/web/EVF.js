import { app } from "../../scripts/app.js";
import { api } from "../../scripts/api.js";
import { ComfyWidgets } from "../../scripts/widgets.js";

app.registerExtension({
    name: "EVF.Preview",
    async beforeRegisterNodeDef(nodeType, nodeData) {
        if (nodeData.name === "EVF") {
            const onNodeCreated = nodeType.prototype.onNodeCreated;
            nodeType.prototype.onNodeCreated = function() {
                const result = onNodeCreated?.apply(this, arguments);
                this.widgets_start_y = 60; // 将控件起始位置向下移动，避免遮挡端口
                this.setupWebSocket();
                
                // 存储原始图像和变换状态
                this.originalState = {
                    horizontalFlip: false,
                    verticalFlip: false,
                    rotationAngle: 0,
                    zoom: 0,
                    panX: 0,
                    panY: 0
                };
                
                // 添加交互状态变量
                this.isMouseDown = false;
                this.lastMouseX = 0;
                this.lastMouseY = 0;
                
                // 添加图像处理控制的事件监听
                this.addTransformationEventListeners();
                
                // 设置复位按钮的样式
                const resetWidget = this.widgets.find(w => w.name === "reset");
                if (resetWidget) {
                    // 设置固定高度
                    resetWidget.computeSize = function(width) {
                        return [width, 30]; // 固定高度为30像素
                    };
                    
                    // 添加点击事件
                    resetWidget.callback = (value) => {
                        if (value) {
                            // 重置其他控件
                            const horizontalFlipWidget = this.widgets.find(w => w.name === "horizontal_flip");
                            const verticalFlipWidget = this.widgets.find(w => w.name === "vertical_flip");
                            const rotationAngleWidget = this.widgets.find(w => w.name === "rotation_angle");
                            
                            if (horizontalFlipWidget) horizontalFlipWidget.value = false;
                            if (verticalFlipWidget) verticalFlipWidget.value = false;
                            if (rotationAngleWidget) rotationAngleWidget.value = 0;
                            
                            // 重置原始状态
                            this.originalState = {
                                horizontalFlip: false,
                                verticalFlip: false,
                                rotationAngle: 0,
                                zoom: 0,
                                panX: 0,
                                panY: 0
                            };
                            
                            // 更新预览
                            this.updatePreview(false);
                            
                            // 重置复位按钮本身
                            setTimeout(() => {
                                resetWidget.value = false;
                            }, 100);
                        }
                    };
                }
                
                // 添加执行节点按钮
                this.addWidget("button", "🚀 SL_Preadjustment 单载预调", null, () => {
                    // 执行当前节点
                    this.executeNode();
                }, { width: 150, tooltip: "单独执行此节点，可以预览调整效果而不执行整个工作流" });
                
                // 设置执行按钮的样式
                const executeButton = this.widgets[this.widgets.length - 1];
                if (executeButton) {
                    executeButton.computeSize = function(width) {
                        return [width, 40]; // 固定高度为40像素
                    };
                    
                    // 添加自定义样式
                    const originalDraw = executeButton.draw;
                    executeButton.draw = function(ctx, node, width, y, height) {
                        // 保存当前上下文状态
                        ctx.save();
                        
                        // 绘制按钮背景
                        ctx.fillStyle = "#4CAF50"; // 绿色背景
                        ctx.strokeStyle = "#2E7D32"; // 深绿色边框
                        ctx.lineWidth = 2;
                        
                        const margin = 10;
                        const x = margin;
                        const buttonWidth = width - margin * 2;
                        const buttonHeight = 36;
                        const radius = 6; // 圆角半径
                        
                        // 绘制圆角矩形
                        ctx.beginPath();
                        ctx.moveTo(x + radius, y);
                        ctx.lineTo(x + buttonWidth - radius, y);
                        ctx.quadraticCurveTo(x + buttonWidth, y, x + buttonWidth, y + radius);
                        ctx.lineTo(x + buttonWidth, y + buttonHeight - radius);
                        ctx.quadraticCurveTo(x + buttonWidth, y + buttonHeight, x + buttonWidth - radius, y + buttonHeight);
                        ctx.lineTo(x + radius, y + buttonHeight);
                        ctx.quadraticCurveTo(x, y + buttonHeight, x, y + buttonHeight - radius);
                        ctx.lineTo(x, y + radius);
                        ctx.quadraticCurveTo(x, y, x + radius, y);
                        ctx.closePath();
                        
                        ctx.fill();
                        ctx.stroke();
                        
                        // 设置文本样式
                        ctx.fillStyle = "white";
                        ctx.font = "bold 16px Arial";
                        ctx.textAlign = "center";
                        ctx.textBaseline = "middle";
                        
                        // 绘制文本
                        ctx.fillText(this.name, x + buttonWidth / 2, y + buttonHeight / 2);
                        
                        // 恢复上下文状态
                        ctx.restore();
                        
                        return buttonHeight + 4; // 返回按钮高度加上一点间距
                    };
                }
                
                return result;
            };
            
            // 添加执行节点的方法
            nodeType.prototype.executeNode = function() {
                // 获取当前节点ID
                const nodeId = String(this.id);
                console.log("执行节点:", nodeId);
                
                // 获取执行按钮
                const executeButton = this.widgets.find(w => w.name === "🚀 SL_Preadjustment 单载预调");
                if (executeButton) {
                    // 更改按钮文本和状态
                    executeButton.name = "⏳ 正在执行...";
                    executeButton.disabled = true;
                }
                
                // 使用与rgthree相同的方法，但只针对当前节点
                const originalQueuePrompt = api.queuePrompt;
                
                // 临时覆盖queuePrompt方法
                api.queuePrompt = async function(index, prompt) {
                    if (prompt.output) {
                        const oldOutput = prompt.output;
                        let newOutput = {};
                        
                        // 递归添加节点及其输入
                        function recursiveAddNodes(currentId, oldOutput, newOutput) {
                            let currentNode = oldOutput[currentId];
                            if (currentNode && newOutput[currentId] == null) {
                                newOutput[currentId] = currentNode;
                                for (const inputValue of Object.values(currentNode.inputs || [])) {
                                    if (Array.isArray(inputValue)) {
                                        recursiveAddNodes(inputValue[0], oldOutput, newOutput);
                                    }
                                }
                            }
                            return newOutput;
                        }
                        
                        // 添加当前节点及其依赖
                        recursiveAddNodes(nodeId, oldOutput, newOutput);
                        prompt.output = newOutput;
                        
                        console.log("执行节点队列:", Object.keys(newOutput));
                    }
                    
                    // 调用原始方法
                    const response = await originalQueuePrompt.apply(api, [index, prompt]);
                    
                    // 恢复原始方法
                    api.queuePrompt = originalQueuePrompt;
                    
                    return response;
                };
                
                // 触发队列执行
                app.queuePrompt(0).then(() => {
                    // 执行完成后恢复按钮状态
                    if (executeButton) {
                        executeButton.name = "🚀 SL_Preadjustment 单载预调";
                        executeButton.disabled = false;
                    }
                }).catch(err => {
                    console.error("执行节点出错:", err);
                    // 出错时也恢复按钮状态
                    if (executeButton) {
                        executeButton.name = "🚀 SL_Preadjustment 单载预调";
                        executeButton.disabled = false;
                    }
                });
            };
            
            // 添加图像处理控制的事件监听方法
            nodeType.prototype.addTransformationEventListeners = function() {
                // 监听水平翻转变化
                const horizontalFlipWidget = this.widgets.find(w => w.name === "horizontal_flip");
                if (horizontalFlipWidget) {
                    horizontalFlipWidget.callback = () => {
                        // 更新原始状态中的水平翻转
                        this.originalState.horizontalFlip = horizontalFlipWidget.value;
                        console.log("水平翻转变化:", horizontalFlipWidget.value);
                        this.updatePreview(false);
                    };
                }
                
                // 监听垂直翻转变化
                const verticalFlipWidget = this.widgets.find(w => w.name === "vertical_flip");
                if (verticalFlipWidget) {
                    verticalFlipWidget.callback = () => {
                        // 更新原始状态中的垂直翻转
                        this.originalState.verticalFlip = verticalFlipWidget.value;
                        console.log("垂直翻转变化:", verticalFlipWidget.value);
                        this.updatePreview(false);
                    };
                }
                
                // 监听旋转角度变化
                const rotationAngleWidget = this.widgets.find(w => w.name === "rotation_angle");
                if (rotationAngleWidget) {
                    rotationAngleWidget.callback = () => {
                        // 更新原始状态中的旋转角度
                        this.originalState.rotationAngle = rotationAngleWidget.value;
                        console.log("旋转角度变化:", rotationAngleWidget.value);
                        this.updatePreview(false);
                    };
                }
                
                // 鼠标和触摸事件监听器现在在onAdded函数中添加
            };
            
            // 鼠标滚轮事件处理 - 缩放
            nodeType.prototype.handleMouseWheel = function(e) {
                e.preventDefault();
                
                // 检查鼠标是否在画布上
                const rect = this.canvas.getBoundingClientRect();
                const mouseX = e.clientX - rect.left;
                const mouseY = e.clientY - rect.top;
                
                // 检查鼠标是否在画布内部
                if (mouseX >= 0 && mouseX <= rect.width && mouseY >= 0 && mouseY <= rect.height) {
                    // 计算滚轮增量，判断方向，delta为正表示向上滚动（放大），负表示向下滚动（缩小）
                    const delta = -Math.sign(e.deltaY) * 0.1; // 缩放增量
                    
                    // 根据滚动方向改变鼠标样式
                    if (delta > 0) {
                        // 放大 - 显示放大镜加号
                        this.canvas.style.cursor = 'zoom-in';
                    } else {
                        // 缩小 - 显示放大镜减号
                        this.canvas.style.cursor = 'zoom-out';
                    }
                    
                    // 设置计时器在1秒后恢复为抓手光标
                    if (this.cursorResetTimeout) {
                        clearTimeout(this.cursorResetTimeout);
                    }
                    this.cursorResetTimeout = setTimeout(() => {
                        if (this.canvas) {
                            this.canvas.style.cursor = 'grab';
                        }
                    }, 1000);
                    
                    // 更新缩放值，限制范围在 -2 到 2 之间
                    this.originalState.zoom = Math.max(-2, Math.min(2, this.originalState.zoom + delta));
                    console.log("缩放变化:", this.originalState.zoom);
                    
                    // 立即更新预览
                    this.updatePreview(false);
                }
            };
            
            // 鼠标按下事件 - 开始拖动
            nodeType.prototype.handleMouseDown = function(e) {
                e.preventDefault();
                
                // 检查鼠标是否在画布上
                const rect = this.canvas.getBoundingClientRect();
                const mouseX = e.clientX - rect.left;
                const mouseY = e.clientY - rect.top;
                
                // 检查鼠标是否在画布内部
                if (mouseX >= 0 && mouseX <= rect.width && mouseY >= 0 && mouseY <= rect.height) {
                    this.isMouseDown = true;
                    this.lastMouseX = mouseX;
                    this.lastMouseY = mouseY;
                    
                    // 改变鼠标样式
                    this.canvas.style.cursor = 'grabbing';
                }
            };
            
            // 鼠标移动事件 - 拖动图像
            nodeType.prototype.handleMouseMove = function(e) {
                if (!this.isMouseDown) return;
                
                const rect = this.canvas.getBoundingClientRect();
                const mouseX = e.clientX - rect.left;
                const mouseY = e.clientY - rect.top;
                
                // 计算鼠标移动距离
                const deltaX = mouseX - this.lastMouseX;
                const deltaY = mouseY - this.lastMouseY;
                
                // 更新平移值，应用4倍移动步长
                // 注意：平移值相对于画布尺寸进行归一化，这样在不同尺寸的画布上表现一致
                this.originalState.panX += deltaX * 4 / rect.width;
                this.originalState.panY += deltaY * 4 / rect.height;
                
                // 限制平移范围在合理值内，防止过度拖拽
                this.originalState.panX = Math.max(-5, Math.min(5, this.originalState.panX));
                this.originalState.panY = Math.max(-5, Math.min(5, this.originalState.panY));
                
                console.log("平移更新: X=", this.originalState.panX, "Y=", this.originalState.panY);
                
                // 更新最后的鼠标位置
                this.lastMouseX = mouseX;
                this.lastMouseY = mouseY;
                
                // 更新预览
                this.updatePreview(true);
            };
            
            // 鼠标松开事件 - 结束拖动
            nodeType.prototype.handleMouseUp = function(e) {
                if (this.isMouseDown) {
                    this.isMouseDown = false;
                    
                    // 恢复鼠标样式为抓手
                    if (this.canvas) {
                        this.canvas.style.cursor = 'grab';
                    }
                    
                    // 更新预览并发送到后端
                    this.updatePreview(false);
                }
            };
            
            // 触摸开始事件 - 开始拖动
            nodeType.prototype.handleTouchStart = function(e) {
                if (e.touches.length === 1) {
                    e.preventDefault();
                    
                    const touch = e.touches[0];
                    const rect = this.canvas.getBoundingClientRect();
                    const touchX = touch.clientX - rect.left;
                    const touchY = touch.clientY - rect.top;
                    
                    this.isMouseDown = true;
                    this.lastMouseX = touchX;
                    this.lastMouseY = touchY;
                }
            };
            
            // 触摸移动事件 - 拖动图像
            nodeType.prototype.handleTouchMove = function(e) {
                if (!this.isMouseDown || e.touches.length !== 1) return;
                
                const touch = e.touches[0];
                const rect = this.canvas.getBoundingClientRect();
                const touchX = touch.clientX - rect.left;
                const touchY = touch.clientY - rect.top;
                
                // 计算触摸移动距离
                const deltaX = touchX - this.lastMouseX;
                const deltaY = touchY - this.lastMouseY;
                
                // 更新平移值，应用4倍移动步长
                // 注意：平移值相对于画布尺寸进行归一化，这样在不同尺寸的画布上表现一致
                this.originalState.panX += deltaX * 4 / rect.width;
                this.originalState.panY += deltaY * 4 / rect.height;
                
                // 限制平移范围在合理值内，防止过度拖拽
                this.originalState.panX = Math.max(-5, Math.min(5, this.originalState.panX));
                this.originalState.panY = Math.max(-5, Math.min(5, this.originalState.panY));
                
                console.log("触摸平移更新: X=", this.originalState.panX, "Y=", this.originalState.panY);
                
                // 更新最后的触摸位置
                this.lastMouseX = touchX;
                this.lastMouseY = touchY;
                
                // 更新预览
                this.updatePreview(true);
            };
            
            // 触摸结束事件 - 结束拖动
            nodeType.prototype.handleTouchEnd = function(e) {
                if (this.isMouseDown) {
                    this.isMouseDown = false;
                    
                    // 更新预览并发送到后端
                    this.updatePreview(false);
                }
            };

            // 添加WebSocket设置方法
            nodeType.prototype.setupWebSocket = function() {
                api.addEventListener("image_preview_update", async (event) => {
                    const data = event.detail;
                    if (data && data.node_id === this.id.toString()) {
                        if (data.image_data) {
                            this.originalWidth = data.original_width;
                            this.originalHeight = data.original_height;
                            this.aspectRatio = data.aspect_ratio || null;
                            this.sourceSize = data.source_size || false;
                            
                            // 接收后端传递的翻转和旋转状态
                            if (data.transform_mode === "original_axis") {
                                // 如果后端指定了使用原始轴向的变换模式
                                const horizontalFlipWidget = this.widgets.find(w => w.name === "horizontal_flip");
                                const verticalFlipWidget = this.widgets.find(w => w.name === "vertical_flip");
                                const rotationAngleWidget = this.widgets.find(w => w.name === "rotation_angle");
                                
                                // 更新控件和原始状态
                                if (horizontalFlipWidget && data.horizontal_flip !== undefined) {
                                    horizontalFlipWidget.value = data.horizontal_flip;
                                    this.originalState.horizontalFlip = data.horizontal_flip;
                                }
                                if (verticalFlipWidget && data.vertical_flip !== undefined) {
                                    verticalFlipWidget.value = data.vertical_flip;
                                    this.originalState.verticalFlip = data.vertical_flip;
                                }
                                if (rotationAngleWidget && data.rotation_angle !== undefined) {
                                    rotationAngleWidget.value = data.rotation_angle;
                                    this.originalState.rotationAngle = data.rotation_angle;
                                }
                            }
                            
                            this.loadImageFromBase64(data.image_data);
                        }
                    }
                });
            };

            // 更新预览方法
            nodeType.prototype.updatePreview = function(onlyPreview = false) {
                if (!this.originalImageData || !this.canvas) {
                    return;
                }
                
                if (this.updateTimeout) {
                    clearTimeout(this.updateTimeout);
                }
                
                this.updateTimeout = setTimeout(() => {
                    console.log("开始更新预览...");
                    
                    // 获取当前变换参数，供后续裁剪使用
                    const horizontalFlip = this.originalState.horizontalFlip;
                    const verticalFlip = this.originalState.verticalFlip;
                    const rotationAngle = this.originalState.rotationAngle;
                    const zoom = this.originalState.zoom;
                    const panX = this.originalState.panX;
                    const panY = this.originalState.panY;
                    
                    console.log("当前变换参数:", {
                        horizontalFlip,
                        verticalFlip,
                        rotationAngle,
                        zoom,
                        panX,
                        panY
                    });
                    
                    // 首先计算所有框的尺寸
                    this.calculateFramePositions();
                    
                    if (!this.frameInfo) return;
                    
                    // 获取C框的最长边作为画布尺寸
                    const squareSize = Math.max(this.frameInfo.safeFrame.width, this.frameInfo.safeFrame.height);
                    
                    // 计算边框宽度（正方形边长的0.3%）
                    const borderWidth = Math.max(1, Math.round(squareSize * 0.003));
                    
                    const ctx = this.canvas.getContext("2d");
                    const originalWidth = this.originalImageData[0].length;
                    const originalHeight = this.originalImageData.length;
                    
                    console.log("原始图像尺寸:", originalWidth, "x", originalHeight);
                    console.log("画布尺寸:", squareSize, "x", squareSize);
                    
                    // 设置画布为正方形尺寸
                    this.canvas.width = squareSize;
                    this.canvas.height = squareSize;
                    
                    // 清除画布，确保完全清除
                    ctx.fillStyle = "#0f0f0f";  // 边框的颜色
                    ctx.fillRect(0, 0, squareSize, squareSize);
                    
                    // 准备临时画布用于原始图像处理
                    if (!this.tempCanvas) {
                        this.tempCanvas = document.createElement('canvas');
                    }
                    
                    // 如果原始图像还未渲染到临时画布，则进行渲染
                    if (!this.originalImageRendered) {
                        console.log("绘制原始图像到临时画布");
                        this.tempCanvas.width = originalWidth;
                        this.tempCanvas.height = originalHeight;
                        const tempCtx = this.tempCanvas.getContext('2d');
                        
                        // 确保临时画布也被完全清除
                        tempCtx.clearRect(0, 0, originalWidth, originalHeight);
                        
                        const imgData = new ImageData(originalWidth, originalHeight);
                        for (let y = 0; y < originalHeight; y++) {
                            for (let x = 0; x < originalWidth; x++) {
                                const dstIdx = (y * originalWidth + x) * 4;
                                const srcPixel = this.originalImageData[y][x];
                                imgData.data[dstIdx] = srcPixel[0];     // R
                                imgData.data[dstIdx + 1] = srcPixel[1]; // G
                                imgData.data[dstIdx + 2] = srcPixel[2]; // B
                                imgData.data[dstIdx + 3] = 255;         // A
                            }
                        }
                        tempCtx.putImageData(imgData, 0, 0);
                        this.originalImageRendered = true;
                    }
                    
                    // 计算缩放比例，使图像适应正方形
                    const scaleRatio = (squareSize - borderWidth*2) / Math.max(originalWidth, originalHeight);
                    const scaledWidth = originalWidth * scaleRatio;
                    const scaledHeight = originalHeight * scaleRatio;
                    
                    console.log("缩放比例:", scaleRatio);
                    console.log("缩放后尺寸:", scaledWidth, "x", scaledHeight);
                    
                    // 创建剪切区域（正方形，减去边框宽度）
                    const clipSize = squareSize - borderWidth*2;
                    ctx.save();
                    ctx.beginPath();
                    ctx.rect(borderWidth, borderWidth, clipSize, clipSize);
                    ctx.clip();
                    
                    // 在裁剪区域内绘制半透明背景
                    ctx.fillStyle = "rgba(255, 255, 255, 0.1)"; // 半透明白色
                    ctx.fillRect(borderWidth, borderWidth, clipSize, clipSize);
                    
                    // 应用变换
                    ctx.save();
                    
                    // 设置变换中心点为画布中心
                    ctx.translate(squareSize / 2, squareSize / 2);
                    
                    // 1. 先应用缩放
                    let zoomScale = 1.0;
                    if (zoom !== 0) {
                        if (zoom > 0) {
                            // 放大：1.0 到 4.0
                            zoomScale = 1.0 + zoom * 1.5;
                        } else {
                            // 缩小：0.25 到 1.0
                            zoomScale = Math.pow(2, zoom);  // 2^zoom
                        }
                        ctx.scale(zoomScale, zoomScale);
                        console.log("应用缩放:", zoomScale);
                    }
                    
                    // 2. 应用旋转 - 移到平移之前，确保旋转轴始终在画布中心
                    if (rotationAngle !== 0) {
                        ctx.rotate(rotationAngle * Math.PI / 180);
                        console.log("应用旋转:", rotationAngle, "度");
                    }
                    
                    // 3. 应用平移 - 在旋转后应用，使平移相对于旋转后的坐标系
                    if (panX !== 0 || panY !== 0) {
                        // 将平移值转换为像素值，考虑缩放因子
                        // 注意：这里除以zoomScale是为了在高缩放时减少平移速度，创造更自然的感觉
                        const pixelPanX = panX * scaledWidth / (2 * zoomScale);
                        const pixelPanY = panY * scaledHeight / (2 * zoomScale);
                        ctx.translate(pixelPanX, pixelPanY);
                        console.log("应用平移:", pixelPanX, pixelPanY, "缩放因子:", zoomScale);
                    }
                    
                    // 4. 最后应用翻转
                    if (horizontalFlip) {
                        ctx.scale(-1, 1);
                        console.log("应用水平翻转");
                    }
                    
                    if (verticalFlip) {
                        ctx.scale(1, -1);
                        console.log("应用垂直翻转");
                    }
                    
                    // 绘制图像（从中心点偏移）
                    ctx.drawImage(
                        this.tempCanvas,
                        -scaledWidth / 2, 
                        -scaledHeight / 2,
                        scaledWidth, 
                        scaledHeight
                    );
                    
                    // 恢复上下文（变换）
                    ctx.restore();
                    
                    // 恢复上下文（裁剪）
                    ctx.restore();
                    
                    console.log("已完成预览图像绘制");
                    
                    // 检查渲染的图像是否有效
                    const mainImageData = ctx.getImageData(0, 0, squareSize, squareSize);
                    let hasValidData = false;
                    
                    // 检查图像是否有非边框色的像素
                    for (let i = 0; i < mainImageData.data.length; i += 4) {
                        // 检查不是边框颜色 #0f0f0f
                        if (mainImageData.data[i] !== 15 || mainImageData.data[i+1] !== 15 || mainImageData.data[i+2] !== 15) {
                            hasValidData = true;
                            break;
                        }
                    }
                    
                    console.log("图像有效性检查:", hasValidData);
                    
                    // 如果图像无效，尝试重新渲染
                    if (!hasValidData) {
                        console.warn("检测到无效图像，尝试重新渲染");
                        this.originalImageRendered = false;
                        // 延迟一点再次尝试更新预览
                        setTimeout(() => {
                            this.updatePreview(onlyPreview);
                        }, 100);
                        return;
                    }
                    
                    // 裁切图像
                    if (!onlyPreview && !this.isAdjusting) {
                        // 裁切图像并发送
                        console.log("开始裁切图像并发送到后端");
                        this.cropAndSendImages(ctx, squareSize);
                    }
                    
                    // 绘制三个框在最上层
                    this.drawFrames(ctx, squareSize, borderWidth);
                    
                }, this.isAdjusting ? 50 : 0);
            };
            
            // 计算框的位置
            nodeType.prototype.calculateFramePositions = function() {
                const originalWidth = this.originalImageData ? this.originalImageData[0].length : 100;
                const originalHeight = this.originalImageData ? this.originalImageData.length : 100;
                
                // 从latent获取裁切比例，如果未提供则使用1:1
                let aspectRatio = this.aspectRatio || 1.0;
                
                // 计算B框（取景框）的尺寸 - 与原始图像等比缩放
                let viewfinderWidth, viewfinderHeight;
                const originalAspectRatio = originalWidth / originalHeight;
                
                if (aspectRatio >= 1) {
                    // 宽大于等于高
                    if (originalAspectRatio >= aspectRatio) {
                        // 原图较宽，以高度为基准
                        viewfinderHeight = originalHeight;
                        viewfinderWidth = viewfinderHeight * aspectRatio;
                    } else {
                        // 原图较高，以宽度为基准
                        viewfinderWidth = originalWidth;
                        viewfinderHeight = viewfinderWidth / aspectRatio;
                    }
                } else {
                    // 高大于宽
                    if (originalAspectRatio <= aspectRatio) {
                        // 原图较高，以宽度为基准
                        viewfinderWidth = originalWidth;
                        viewfinderHeight = viewfinderWidth / aspectRatio;
                    } else {
                        // 原图较宽，以高度为基准
                        viewfinderHeight = originalHeight;
                        viewfinderWidth = viewfinderHeight * aspectRatio;
                    }
                }
                
                // 计算C框（安全框）的尺寸 - C框长边为B框的116%，短边上下各增加16%
                let safeFrameWidth, safeFrameHeight;
                if (aspectRatio >= 1) {
                    // 宽大于等于高 (长边是宽)
                    safeFrameWidth = viewfinderWidth * 1.16; // 长边为B框的116%
                    safeFrameHeight = viewfinderHeight + (viewfinderHeight * 0.32); // 短边上下各增加16%
                } else {
                    // 高大于宽 (长边是高)
                    safeFrameHeight = viewfinderHeight * 1.16; // 长边为B框的116%
                    safeFrameWidth = viewfinderWidth + (viewfinderWidth * 0.32); // 短边上下各增加16%
                }
                
                // 计算D框（与B框大小一致）
                let cropFrameWidth = viewfinderWidth;
                let cropFrameHeight = viewfinderHeight;
                
                // 计算A框（准心框）的尺寸 - 使用和B框相同的比例，大小为B框的1/3
                let crosshairWidth, crosshairHeight;
                const crosshairScale = 1/3;
                
                crosshairWidth = viewfinderWidth * crosshairScale;
                crosshairHeight = viewfinderHeight * crosshairScale;
                
                // 计算居中位置 - 这里先保存相对中心点的位置，后续绘制时再确定实际位置
                const squareSize = Math.max(safeFrameWidth, safeFrameHeight);
                const viewfinderX = (squareSize - viewfinderWidth) / 2;
                const viewfinderY = (squareSize - viewfinderHeight) / 2;
                const safeFrameX = (squareSize - safeFrameWidth) / 2;
                const safeFrameY = (squareSize - safeFrameHeight) / 2;
                const cropFrameX = viewfinderX;
                const cropFrameY = viewfinderY;
                const crosshairX = (squareSize - crosshairWidth) / 2;
                const crosshairY = (squareSize - crosshairHeight) / 2;
                
                // 保存尺寸信息以供裁切使用
                this.frameInfo = {
                    viewfinder: {
                        x: viewfinderX,
                        y: viewfinderY,
                        width: viewfinderWidth,
                        height: viewfinderHeight
                    },
                    safeFrame: {
                        x: safeFrameX,
                        y: safeFrameY,
                        width: safeFrameWidth,
                        height: safeFrameHeight
                    },
                    cropFrame: {
                        x: cropFrameX,
                        y: cropFrameY,
                        width: cropFrameWidth,
                        height: cropFrameHeight
                    },
                    crosshair: {
                        x: crosshairX,
                        y: crosshairY,
                        width: crosshairWidth,
                        height: crosshairHeight
                    }
                };
            };
            
            // 绘制框和遮挡层
            nodeType.prototype.drawFrames = function(ctx, squareSize, borderWidth) {
                if (!this.frameInfo) {
                    this.calculateFramePositions();
                }
                
                const innerSize = squareSize - borderWidth * 2;
                
                // 从frameInfo获取各框尺寸
                const viewfinderX = this.frameInfo.viewfinder.x;
                const viewfinderY = this.frameInfo.viewfinder.y;
                const viewfinderWidth = this.frameInfo.viewfinder.width;
                const viewfinderHeight = this.frameInfo.viewfinder.height;
                
                const safeFrameX = this.frameInfo.safeFrame.x;
                const safeFrameY = this.frameInfo.safeFrame.y;
                const safeFrameWidth = this.frameInfo.safeFrame.width;
                const safeFrameHeight = this.frameInfo.safeFrame.height;
                
                const cropFrameX = this.frameInfo.cropFrame.x;
                const cropFrameY = this.frameInfo.cropFrame.y;
                const cropFrameWidth = this.frameInfo.cropFrame.width;
                const cropFrameHeight = this.frameInfo.cropFrame.height;
                
                const crosshairX = this.frameInfo.crosshair.x;
                const crosshairY = this.frameInfo.crosshair.y;
                const crosshairWidth = this.frameInfo.crosshair.width;
                const crosshairHeight = this.frameInfo.crosshair.height;
                
                // ==== 第2层：D框和遮挡层 ====
                
                // 绘制D框 - 线宽0.3%，透明度50%
                const cropFrameLineWidth = Math.max(1, Math.round(innerSize * 0.003));
                ctx.strokeStyle = "rgba(26, 112, 154, 0.5)"; // #1a709a with 50% opacity
                ctx.lineWidth = cropFrameLineWidth;
                ctx.strokeRect(cropFrameX, cropFrameY, cropFrameWidth, cropFrameHeight);
                
                // 绘制F遮挡 - C框外的遮挡层，颜色#0f0f0f，透明度85%
                ctx.fillStyle = "rgba(15, 15, 15, 0.85)";
                ctx.beginPath();
                // 绘制整个画布区域
                ctx.rect(0, 0, squareSize, squareSize);
                // 从中间挖出C框区域
                ctx.rect(safeFrameX, safeFrameY, safeFrameWidth, safeFrameHeight);
                ctx.fill("evenodd");
                
                // 绘制E遮挡 - C框内D框外的遮挡层，颜色#191919，透明度50%
                ctx.fillStyle = "rgba(25, 25, 25, 0.5)";
                ctx.beginPath();
                // 绘制C框区域
                ctx.rect(safeFrameX, safeFrameY, safeFrameWidth, safeFrameHeight);
                // 从中间挖出D框区域
                ctx.rect(cropFrameX, cropFrameY, cropFrameWidth, cropFrameHeight);
                ctx.fill("evenodd");
                
                // ==== 第1层：A框、B框、C框 ====
                
                // 绘制C框（安全框）- 闭合的#1a709a颜色框，线宽0.3%
                const safeFrameLineWidth = Math.max(1, Math.round(innerSize * 0.003));
                ctx.strokeStyle = "rgba(26, 112, 154, 0.6)"; // #1a709a with 60% opacity
                ctx.lineWidth = safeFrameLineWidth;
                ctx.strokeRect(safeFrameX, safeFrameY, safeFrameWidth, safeFrameHeight);
                
                // 为C框添加四角L型线段覆盖，线宽0.7%，长度7%，仅拐角处使用圆角，紧贴框内
                const cCornerLineWidth = Math.max(1, Math.round(innerSize * 0.007));
                const cCornerLength = Math.round(innerSize * 0.07);
                const cornerRadius = Math.max(2, Math.round(innerSize * 0.01)); // 拐角圆角半径
                
                ctx.strokeStyle = "rgba(26, 112, 154, 0.7)"; // #1a709a with 70% opacity
                ctx.lineWidth = cCornerLineWidth;
                ctx.lineCap = "butt"; // 使线段端点为方形
                ctx.lineJoin = "round"; // 仅在连接处使用圆形
                
                // 左上角 - 紧贴内侧
                ctx.beginPath();
                // 计算线宽的一半，用于调整位置以紧贴内侧
                const halfLineWidth = cCornerLineWidth / 2;
                
                // 左上角
                ctx.beginPath();
                ctx.moveTo(safeFrameX + halfLineWidth, safeFrameY + cCornerLength);
                ctx.lineTo(safeFrameX + halfLineWidth, safeFrameY + halfLineWidth);
                ctx.lineTo(safeFrameX + cCornerLength, safeFrameY + halfLineWidth);
                ctx.stroke();
                
                // 右上角
                ctx.beginPath();
                ctx.moveTo(safeFrameX + safeFrameWidth - cCornerLength, safeFrameY + halfLineWidth);
                ctx.lineTo(safeFrameX + safeFrameWidth - halfLineWidth, safeFrameY + halfLineWidth);
                ctx.lineTo(safeFrameX + safeFrameWidth - halfLineWidth, safeFrameY + cCornerLength);
                ctx.stroke();
                
                // 右下角
                ctx.beginPath();
                ctx.moveTo(safeFrameX + safeFrameWidth - halfLineWidth, safeFrameY + safeFrameHeight - cCornerLength);
                ctx.lineTo(safeFrameX + safeFrameWidth - halfLineWidth, safeFrameY + safeFrameHeight - halfLineWidth);
                ctx.lineTo(safeFrameX + safeFrameWidth - cCornerLength, safeFrameY + safeFrameHeight - halfLineWidth);
                ctx.stroke();
                
                // 左下角
                ctx.beginPath();
                ctx.moveTo(safeFrameX + cCornerLength, safeFrameY + safeFrameHeight - halfLineWidth);
                ctx.lineTo(safeFrameX + halfLineWidth, safeFrameY + safeFrameHeight - halfLineWidth);
                ctx.lineTo(safeFrameX + halfLineWidth, safeFrameY + safeFrameHeight - cCornerLength);
                ctx.stroke();
                
                // 重置线条样式
                ctx.lineCap = "butt";
                ctx.lineJoin = "miter";
                
                // 绘制B框（取景框）- 不闭合的四角L型线段，#00aaff颜色，线宽0.5%，长度8%
                const viewfinderLineWidth = Math.max(1, Math.round(innerSize * 0.005));
                const cornerLength = Math.round(innerSize * 0.08);
                
                ctx.strokeStyle = "rgba(0, 170, 255, 0.6)"; // #00aaff with 60% opacity
                ctx.lineWidth = viewfinderLineWidth;
                ctx.lineCap = "butt"; // 使线段端点为方形
                ctx.lineJoin = "round"; // 拐角处使用圆形
                ctx.beginPath();
                
                // 左上角
                ctx.beginPath();
                ctx.moveTo(viewfinderX, viewfinderY + cornerLength);
                ctx.lineTo(viewfinderX, viewfinderY);
                ctx.lineTo(viewfinderX + cornerLength, viewfinderY);
                ctx.stroke();
                
                // 右上角
                ctx.beginPath();
                ctx.moveTo(viewfinderX + viewfinderWidth - cornerLength, viewfinderY);
                ctx.lineTo(viewfinderX + viewfinderWidth, viewfinderY);
                ctx.lineTo(viewfinderX + viewfinderWidth, viewfinderY + cornerLength);
                ctx.stroke();
                
                // 右下角
                ctx.beginPath();
                ctx.moveTo(viewfinderX + viewfinderWidth, viewfinderY + viewfinderHeight - cornerLength);
                ctx.lineTo(viewfinderX + viewfinderWidth, viewfinderY + viewfinderHeight);
                ctx.lineTo(viewfinderX + viewfinderWidth - cornerLength, viewfinderY + viewfinderHeight);
                ctx.stroke();
                
                // 左下角
                ctx.beginPath();
                ctx.moveTo(viewfinderX + cornerLength, viewfinderY + viewfinderHeight);
                ctx.lineTo(viewfinderX, viewfinderY + viewfinderHeight);
                ctx.lineTo(viewfinderX, viewfinderY + viewfinderHeight - cornerLength);
                ctx.stroke();
                
                // 重置线条样式
                ctx.lineCap = "butt";
                ctx.lineJoin = "miter";
                
                // 绘制A框（准心框）- 不闭合的四角L型线段，#00aaff颜色，线宽0.25%，长度2%
                const crosshairLineWidth = Math.max(1, Math.round(innerSize * 0.0025));
                const crosshairCornerLength = Math.round(innerSize * 0.02);
                
                ctx.strokeStyle = "rgba(0, 170, 255, 0.6)"; // #00aaff with 60% opacity
                ctx.lineWidth = crosshairLineWidth;
                ctx.lineCap = "butt"; // 使线段端点为方形
                ctx.lineJoin = "round"; // 拐角处使用圆形
                
                // 左上角
                ctx.beginPath();
                ctx.moveTo(crosshairX, crosshairY + crosshairCornerLength);
                ctx.lineTo(crosshairX, crosshairY);
                ctx.lineTo(crosshairX + crosshairCornerLength, crosshairY);
                ctx.stroke();
                
                // 右上角
                ctx.beginPath();
                ctx.moveTo(crosshairX + crosshairWidth - crosshairCornerLength, crosshairY);
                ctx.lineTo(crosshairX + crosshairWidth, crosshairY);
                ctx.lineTo(crosshairX + crosshairWidth, crosshairY + crosshairCornerLength);
                ctx.stroke();
                
                // 右下角
                ctx.beginPath();
                ctx.moveTo(crosshairX + crosshairWidth, crosshairY + crosshairHeight - crosshairCornerLength);
                ctx.lineTo(crosshairX + crosshairWidth, crosshairY + crosshairHeight);
                ctx.lineTo(crosshairX + crosshairWidth - crosshairCornerLength, crosshairY + crosshairHeight);
                ctx.stroke();
                
                // 左下角
                ctx.beginPath();
                ctx.moveTo(crosshairX + crosshairCornerLength, crosshairY + crosshairHeight);
                ctx.lineTo(crosshairX, crosshairY + crosshairHeight);
                ctx.lineTo(crosshairX, crosshairY + crosshairHeight - crosshairCornerLength);
                ctx.stroke();
                
                // 重置线条样式
                ctx.lineCap = "butt";
                ctx.lineJoin = "miter";
                
                // 绘制准心十字线，线宽0.25%，长度2%
                const crossLength = Math.round(innerSize * 0.02);
                ctx.beginPath();
                
                // 水平线
                ctx.moveTo(squareSize / 2 - crossLength, squareSize / 2);
                ctx.lineTo(squareSize / 2 + crossLength, squareSize / 2);
                
                // 垂直线
                ctx.moveTo(squareSize / 2, squareSize / 2 - crossLength);
                ctx.lineTo(squareSize / 2, squareSize / 2 + crossLength);
                
                ctx.stroke();
            };
            
            // 裁切图像并发送到后端
            nodeType.prototype.cropAndSendImages = function(ctx, squareSize) {
                if (!this.frameInfo) return;
                
                try {
                    console.log("开始裁剪图像...");
                    
                    // 创建一个临时画布，大小与原画布相同，但只复制图像，不包含框和遮挡
                    const originalCanvas = document.createElement('canvas');
                    originalCanvas.width = squareSize;
                    originalCanvas.height = squareSize;
                    
                    // 获取当前变换参数
                    const horizontalFlip = this.originalState.horizontalFlip;
                    const verticalFlip = this.originalState.verticalFlip;
                    const rotationAngle = this.originalState.rotationAngle;
                    const zoom = this.originalState.zoom;
                    const panX = this.originalState.panX;
                    const panY = this.originalState.panY;
                    const sourceSize = this.widgets.find(w => w.name === "source_size")?.value || false;
                    
                    console.log("裁剪时的变换参数:", {
                        horizontalFlip,
                        verticalFlip,
                        rotationAngle,
                        zoom,
                        panX,
                        panY,
                        sourceSize
                    });
                    
                    if (!this.tempCanvas || !this.originalImageData) return;
                    
                    const originalWidth = this.originalImageData[0].length;
                    const originalHeight = this.originalImageData.length;
                    
                    console.log("原始尺寸:", originalWidth, "x", originalHeight);
                    
                    // 创建一个纯图像画布，不包含边框和遮挡层
                    const pureImageCanvas = document.createElement('canvas');
                    pureImageCanvas.width = squareSize;
                    pureImageCanvas.height = squareSize;
                    const pureImageCtx = pureImageCanvas.getContext('2d');
                    
                    // 清除画布
                    pureImageCtx.clearRect(0, 0, squareSize, squareSize);
                    
                    // 填充背景色，使用#272727
                    pureImageCtx.fillStyle = "#272727";
                    pureImageCtx.fillRect(0, 0, squareSize, squareSize);
                    
                    // 应用相同的变换渲染纯图像
                    pureImageCtx.save();
                    
                    // 设置变换中心点为画布中心
                    pureImageCtx.translate(squareSize / 2, squareSize / 2);
                    
                    // 1. 先应用缩放
                    let zoomScale = 1.0;
                    if (zoom !== 0) {
                        if (zoom > 0) {
                            // 放大：1.0 到 4.0
                            zoomScale = 1.0 + zoom * 1.5;
                        } else {
                            // 缩小：0.25 到 1.0
                            zoomScale = Math.pow(2, zoom);  // 2^zoom
                        }
                        pureImageCtx.scale(zoomScale, zoomScale);
                    }
                    
                    // 2. 应用旋转 - 移到平移之前，确保旋转轴始终在画布中心
                    if (rotationAngle !== 0) {
                        pureImageCtx.rotate(rotationAngle * Math.PI / 180);
                    }
                    
                    // 3. 应用平移 - 在旋转后应用，使平移相对于旋转后的坐标系
                    if (panX !== 0 || panY !== 0) {
                        // 计算缩放比例，使图像适应正方形
                        const scaleRatio = (squareSize - 2) / Math.max(originalWidth, originalHeight);
                        const scaledWidth = originalWidth * scaleRatio;
                        const scaledHeight = originalHeight * scaleRatio;
                        
                        // 将平移值转换为像素值，考虑缩放因子
                        const pixelPanX = panX * scaledWidth / (2 * zoomScale);
                        const pixelPanY = panY * scaledHeight / (2 * zoomScale);
                        pureImageCtx.translate(pixelPanX, pixelPanY);
                    }
                    
                    // 4. 最后应用翻转
                    if (horizontalFlip) {
                        pureImageCtx.scale(-1, 1);
                    }
                    
                    if (verticalFlip) {
                        pureImageCtx.scale(1, -1);
                    }
                    
                    // 计算缩放比例，使图像适应正方形
                    const scaleRatio = (squareSize - 2) / Math.max(originalWidth, originalHeight);
                    const scaledWidth = originalWidth * scaleRatio;
                    const scaledHeight = originalHeight * scaleRatio;
                    
                    // 绘制图像（从中心点偏移）
                    pureImageCtx.drawImage(
                        this.tempCanvas,
                        -scaledWidth / 2, 
                        -scaledHeight / 2,
                        scaledWidth, 
                        scaledHeight
                    );
                    
                    // 恢复上下文
                    pureImageCtx.restore();
                    
                    // 复制主画布内容到originalCanvas用于取景框裁剪
                    const originalCtx = originalCanvas.getContext('2d');
                    originalCtx.drawImage(this.canvas, 0, 0);
                    
                    // 裁切B框图像（取景框）- 从带框的画布裁剪
                    const viewfinderCanvas = document.createElement('canvas');
                    viewfinderCanvas.width = this.frameInfo.viewfinder.width;
                    viewfinderCanvas.height = this.frameInfo.viewfinder.height;
                    const viewfinderCtx = viewfinderCanvas.getContext('2d');
                    
                    // 记录裁剪区域的信息
                    console.log("取景框裁剪区域:", {
                        x: this.frameInfo.viewfinder.x,
                        y: this.frameInfo.viewfinder.y,
                        width: this.frameInfo.viewfinder.width,
                        height: this.frameInfo.viewfinder.height
                    });
                    
                    viewfinderCtx.drawImage(
                        originalCanvas,
                        this.frameInfo.viewfinder.x,
                        this.frameInfo.viewfinder.y,
                        this.frameInfo.viewfinder.width,
                        this.frameInfo.viewfinder.height,
                        0, 0,
                        this.frameInfo.viewfinder.width,
                        this.frameInfo.viewfinder.height
                    );
                    
                    // 裁切C框图像（安全框）- 从纯图像画布裁剪，不包含边框和遮挡层
                    const safeFrameCanvas = document.createElement('canvas');
                    safeFrameCanvas.width = this.frameInfo.safeFrame.width;
                    safeFrameCanvas.height = this.frameInfo.safeFrame.height;
                    const safeFrameCtx = safeFrameCanvas.getContext('2d');
                    
                    // 记录裁剪区域的信息
                    console.log("安全框裁剪区域:", {
                        x: this.frameInfo.safeFrame.x,
                        y: this.frameInfo.safeFrame.y,
                        width: this.frameInfo.safeFrame.width,
                        height: this.frameInfo.safeFrame.height
                    });
                    
                    safeFrameCtx.drawImage(
                        pureImageCanvas,
                        this.frameInfo.safeFrame.x,
                        this.frameInfo.safeFrame.y,
                        this.frameInfo.safeFrame.width,
                        this.frameInfo.safeFrame.height,
                        0, 0,
                        this.frameInfo.safeFrame.width,
                        this.frameInfo.safeFrame.height
                    );
                    
                    console.log("已完成裁剪");
                    
                    // 检查裁剪结果的有效性
                    const vfImageData = viewfinderCtx.getImageData(0, 0, viewfinderCanvas.width, viewfinderCanvas.height);
                    const sfImageData = safeFrameCtx.getImageData(0, 0, safeFrameCanvas.width, safeFrameCanvas.height);
                    
                    // 检查裁剪图像是否有有效数据（非全黑）
                    let vfHasValidData = false;
                    let sfHasValidData = false;
                    
                    // 取景框检查
                    for (let i = 0; i < vfImageData.data.length; i += 4) {
                        if (vfImageData.data[i] > 10 || vfImageData.data[i+1] > 10 || vfImageData.data[i+2] > 10) {
                            vfHasValidData = true;
                            break;
                        }
                    }
                    
                    // 安全框检查
                    for (let i = 0; i < sfImageData.data.length; i += 4) {
                        // 检查不是背景色 #272727 (RGB: 39,39,39)
                        if (sfImageData.data[i] !== 39 || sfImageData.data[i+1] !== 39 || sfImageData.data[i+2] !== 39) {
                            sfHasValidData = true;
                            break;
                        }
                    }
                    
                    console.log("裁剪结果检查: 取景框有效=", vfHasValidData, "安全框有效=", sfHasValidData);
                    
                    if (!vfHasValidData || !sfHasValidData) {
                        console.warn("裁剪结果异常，可能为空白图像");
                    }
                    
                    // 转换为blob并发送
                    Promise.all([
                        new Promise(resolve => {
                            viewfinderCanvas.toBlob(resolve, 'image/jpeg', 0.9);
                        }),
                        new Promise(resolve => {
                            safeFrameCanvas.toBlob(resolve, 'image/jpeg', 0.9);
                        })
                    ]).then(([viewfinderBlob, safeFrameBlob]) => {
                        const formData = new FormData();
                        formData.append('node_id', String(this.id));
                        formData.append('width', viewfinderCanvas.width);
                        formData.append('height', viewfinderCanvas.height);
                        formData.append('image_data', viewfinderBlob, 'viewfinder_image.jpg');
                        formData.append('image_safe_data', safeFrameBlob, 'safe_frame_image.jpg');
                        formData.append('source_size', sourceSize);
                        
                        // 发送当前变换状态
                        formData.append('horizontal_flip', horizontalFlip);
                        formData.append('vertical_flip', verticalFlip);
                        formData.append('rotation_angle', rotationAngle);
                        formData.append('zoom', zoom);
                        formData.append('pan_x', panX);
                        formData.append('pan_y', panY);
                        
                        console.log("发送裁剪结果到后端", {
                            width: viewfinderCanvas.width,
                            height: viewfinderCanvas.height,
                            horizontalFlip,
                            verticalFlip,
                            rotationAngle,
                            zoom,
                            panX,
                            panY
                        });
                        
                        api.fetchApi('/image_preview/apply', {
                            method: 'POST',
                            body: formData
                        });
                    });
                } catch (error) {
                    // 错误处理并输出日志
                    console.error("裁剪图像出错:", error);
                }
            };

            // 发送调整后的数据
            nodeType.prototype.sendAdjustedData = async function(adjustedData) {
                try {
                    const endpoint = '/image_preview/apply';
                    const nodeId = String(this.id);
                    
                    const canvas = document.createElement('canvas');
                    canvas.width = adjustedData.width;
                    canvas.height = adjustedData.height;
                    const ctx = canvas.getContext('2d');
                    ctx.putImageData(adjustedData, 0, 0);
                    
                    const blob = await new Promise(resolve => {
                        canvas.toBlob(resolve, 'image/jpeg', 0.9);
                    });
                    
                    const formData = new FormData();
                    formData.append('node_id', nodeId);
                    formData.append('width', adjustedData.width);
                    formData.append('height', adjustedData.height);
                    formData.append('image_data', blob, 'adjusted_image.jpg');
                    
                    api.fetchApi(endpoint, {
                        method: 'POST',
                        body: formData
                    });
                } catch (error) {
                    // 错误处理，但不输出日志
                }
            };

            // 添加从base64加载图像的方法
            nodeType.prototype.loadImageFromBase64 = function(base64Data) {
                const img = new Image();
                
                img.onload = () => {
                    this.originalImageRendered = false;
                    
                    const tempCanvas = document.createElement('canvas');
                    tempCanvas.width = img.width;
                    tempCanvas.height = img.height;
                    const tempCtx = tempCanvas.getContext('2d');
                    
                    tempCtx.drawImage(img, 0, 0);
                    const imageData = tempCtx.getImageData(0, 0, img.width, img.height);
                    
                    const pixelArray = [];
                    for (let y = 0; y < img.height; y++) {
                        const row = [];
                        for (let x = 0; x < img.width; x++) {
                            const idx = (y * img.width + x) * 4;
                            row.push([
                                imageData.data[idx],     // R
                                imageData.data[idx + 1], // G
                                imageData.data[idx + 2]  // B
                            ]);
                        }
                        pixelArray.push(row);
                    }
                    
                    this.originalImageData = pixelArray;
                    this.updatePreview();
                };
                
                img.src = base64Data;
            };

            // 添加节点时的处理
            const onAdded = nodeType.prototype.onAdded;
            nodeType.prototype.onAdded = function() {
                const result = onAdded?.apply(this, arguments);
                
                if (!this.previewElement && this.id !== undefined && this.id !== -1) {
                    const previewContainer = document.createElement("div");
                    previewContainer.style.position = "relative";
                    previewContainer.style.width = "100%";
                    previewContainer.style.height = "100%";
                    previewContainer.style.backgroundColor = "#333";
                    previewContainer.style.borderRadius = "8px";
                    previewContainer.style.overflow = "hidden";
                    
                    const canvas = document.createElement("canvas");
                    canvas.style.width = "100%";
                    canvas.style.height = "100%";
                    canvas.style.objectFit = "contain";
                    
                    previewContainer.appendChild(canvas);
                    
                    this.canvas = canvas;
                    this.previewElement = previewContainer;
                    
                    this.widgets ||= [];
                    this.widgets_up = true;
                    
                    requestAnimationFrame(() => {
                        if (this.widgets) {
                            this.previewWidget = this.addDOMWidget("preview", "preview", previewContainer);
                            this.setDirtyCanvas(true, true);
                            
                            // 在canvas添加到DOM后添加事件监听器
                            console.log("正在添加画布交互事件监听器...");
                            
                            // 添加鼠标滚轮事件监听器 - 用于缩放
                            this.canvas.addEventListener('wheel', this.handleMouseWheel.bind(this));
                            this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
                            document.addEventListener('mousemove', this.handleMouseMove.bind(this));
                            document.addEventListener('mouseup', this.handleMouseUp.bind(this));
                            
                            // 添加触摸事件支持
                            this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this));
                            document.addEventListener('touchmove', this.handleTouchMove.bind(this));
                            document.addEventListener('touchend', this.handleTouchEnd.bind(this));
                            
                            // 添加鼠标悬停事件 - 显示抓手光标
                            this.canvas.addEventListener('mouseenter', this.handleMouseEnter.bind(this));
                            this.canvas.addEventListener('mouseleave', this.handleMouseLeave.bind(this));
                        }
                    });
                }
                
                return result;
            };

            // 鼠标进入事件 - 显示抓手光标
            nodeType.prototype.handleMouseEnter = function(e) {
                if (this.canvas) {
                    this.canvas.style.cursor = 'grab'; // 默认显示抓手光标
                }
            };
            
            // 鼠标离开事件 - 恢复默认光标
            nodeType.prototype.handleMouseLeave = function(e) {
                if (this.canvas) {
                    this.canvas.style.cursor = 'default';
                }
            };
        }
    }
}); 