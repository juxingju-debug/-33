/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect, useContext, useMemo } from 'react';
import { 
  Upload, Image as ImageIcon, RefreshCw, Copy, Check, Info, Layout, Box, 
  Wand2, Trash2, MessageSquare, Sparkles, Sun, Moon, FileSpreadsheet, 
  FileText, Bot, X, ArrowRight, Languages, Settings2, RotateCw, Palette, 
  Zap, Plus, Monitor, Smartphone, Maximize, Loader2, Download, 
  Lightbulb, Link, Droplets 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GoogleGenAI } from "@google/genai";

// --- Constants & Styles ---
const TEXT_MODEL = "gemini-3.1-pro-preview"; // For complex reasoning and prompt generation
const IMAGE_MODEL = "gemini-2.5-flash-image"; // For image-to-image editing

const STYLE_PRESETS = [
  { id: 'realistic', name: '超写实摄影', value: 'photorealistic, 8k resolution, cinematic lighting, shot on Sony A7R IV, 85mm lens, incredibly detailed' },
  { id: 'studio', name: '纯净棚拍', value: 'clean studio photography, white background, softbox lighting, commercial product photography, minimalist, high key' },
  { id: 'lifestyle', name: '生活场景', value: 'cozy lifestyle setting, warm natural lighting, depth of field, bokeh, authentic atmosphere, interior design context' },
  { id: '3d', name: '3D 渲染', value: '3D rendering, Octane render, C4D, unreal engine 5, ray tracing, surreal abstract background, geometric shapes' },
];

const MODEL_OPTIONS = [
  { id: 'midjourney', name: 'Midjourney v6', description: '专业绘图，包含参数 (--ar --v)' },
  { id: 'nano_banana', name: 'Nano Banana Pro', description: 'Google 新一代模型，自然语言描述' },
];

const ASPECT_RATIOS = [
  { id: 'ar_1_1', name: '1:1 (主图)', value: '--ar 1:1', icon: Box },
  { id: 'ar_3_4', name: '3:4 (移动端)', value: '--ar 3:4', icon: Smartphone },
  { id: 'ar_16_9', name: '16:9 (A+ 页面)', value: '--ar 16:9', icon: Monitor },
];

const COMPOSITION_WEIGHTS = [
    { id: 'low', label: '弱 (自由发挥)', desc: '允许AI大幅改变视角与构图' },
    { id: 'medium', label: '中 (适度参考)', desc: '保留主体关系，允许微调' },
    { id: 'high', label: '强 (严格保持)', desc: '锁定原图视角、人物姿态与主体位置' },
];

const COLOR_FUSION_WEIGHTS = [
    { id: 'contrast', label: '弱 (对比突出)', desc: '使用对比色背景，让产品视觉焦点更突出' },
    { id: 'natural', label: '中 (自然协调)', desc: '常规商业布光，自然的色彩搭配' },
    { id: 'monochromatic', label: '强 (同色系)', desc: '强制环境与道具颜色与产品主色调一致，打造高级感' },
];

// --- Context ---
const ThemeContext = React.createContext({ isDarkMode: false, toggleTheme: () => {} });

// --- Helper Functions ---
const fileToBase64 = (file: File): Promise<{ inlineData: { mimeType: string, data: string } }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64String = (reader.result as string).split(',')[1];
      resolve({
        inlineData: {
          mimeType: file.type,
          data: base64String
        }
      });
    };
    reader.onerror = (error) => reject(error);
  });
};

const dataURLtoFile = (dataurl: string, filename: string) => {
    let arr = dataurl.split(','), mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch) return null;
    let mime = mimeMatch[1],
        bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
    while(n--){
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, {type:mime});
}

// --- Components ---

const ColorPalette = ({ isOpen, onClose, primaryColor, setPrimaryColor, isDarkMode }: any) => {
  const [localColor, setLocalColor] = useState(primaryColor);
  const paletteRef = useRef<HTMLDivElement>(null);

  // Update CSS variables directly for maximum smoothness during dragging
  const updateCSSVars = (color: string) => {
    document.documentElement.style.setProperty('--primary-color', color);
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    document.documentElement.style.setProperty('--primary-color-rgb', `${r}, ${g}, ${b}`);
  };

  useEffect(() => {
    setLocalColor(primaryColor);
    updateCSSVars(primaryColor);
  }, [primaryColor]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (paletteRef.current && !paletteRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value;
    setLocalColor(newColor);
    // Direct DOM update for smoothness
    updateCSSVars(newColor);
  };

  const handleColorComplete = () => {
    setPrimaryColor(localColor);
  };

  const handlePresetClick = (color: string) => {
    setLocalColor(color);
    setPrimaryColor(color);
    updateCSSVars(color);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div 
          ref={paletteRef}
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.95 }}
          transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
          className={`absolute right-0 top-full mt-3 w-72 p-5 rounded-[2rem] border shadow-2xl z-50 ${
            isDarkMode ? 'bg-zinc-900/95 border-zinc-800 backdrop-blur-xl' : 'bg-white/95 border-zinc-200 backdrop-blur-xl'
          }`}
        >
          <div className="flex items-center justify-between mb-5">
            <h4 className={`text-[11px] font-black uppercase tracking-[0.2em] ${isDarkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
              Theme Engine
            </h4>
            <div className="flex gap-1">
              <div className="w-1.5 h-1.5 rounded-full bg-red-500/50" />
              <div className="w-1.5 h-1.5 rounded-full bg-amber-500/50" />
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500/50" />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mb-6">
            {THEME_PALETTES.map(p => (
              <button
                key={p.name}
                onClick={() => handlePresetClick(p.color)}
                className={`group relative flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all duration-300 ${
                  localColor.toLowerCase() === p.color.toLowerCase() 
                    ? 'border-[var(--primary-color)] bg-[var(--primary-color)]/5 ring-4 ring-[var(--primary-color)]/10' 
                    : isDarkMode ? 'border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/50' : 'border-zinc-100 hover:border-zinc-200 hover:bg-zinc-50'
                }`}
              >
                <div 
                  className="w-10 h-10 rounded-full shadow-inner transition-transform duration-500 group-hover:scale-110" 
                  style={{ backgroundColor: p.color }} 
                />
                <span className={`text-[9px] font-bold tracking-tight ${isDarkMode ? 'text-zinc-400' : 'text-zinc-500'}`}>
                  {p.name}
                </span>
                {localColor.toLowerCase() === p.color.toLowerCase() && (
                  <motion.div 
                    layoutId="active-dot"
                    className="absolute -top-1 -right-1 w-3 h-3 bg-[var(--primary-color)] rounded-full border-2 border-white dark:border-zinc-900 shadow-sm"
                  />
                )}
              </button>
            ))}
          </div>

          <div className={`pt-5 border-t ${isDarkMode ? 'border-zinc-800' : 'border-zinc-100'}`}>
            <div className="flex items-center justify-between mb-3">
              <label className={`text-[10px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
                Custom Hue
              </label>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md ${isDarkMode ? 'bg-zinc-800 text-zinc-400' : 'bg-zinc-100 text-zinc-500'}`}>
                {localColor.toUpperCase()}
              </span>
            </div>
            <div className="relative h-10 group">
              <input 
                type="color" 
                value={localColor}
                onChange={handleColorChange}
                onBlur={handleColorComplete}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
              />
              <div 
                className="w-full h-full rounded-xl border-2 border-white dark:border-zinc-800 shadow-inner transition-transform duration-300 group-hover:scale-[1.02]"
                style={{ backgroundColor: localColor }}
              />
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <Droplets size={16} className="text-white mix-blend-difference opacity-50" />
              </div>
            </div>
            <p className={`text-[9px] mt-3 leading-relaxed ${isDarkMode ? 'text-zinc-600' : 'text-zinc-400'}`}>
              Drag to adjust the primary interface color. All elements will sync in real-time.
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

const Button = ({ children, onClick, disabled, variant = 'primary', className = "" }: any) => {
  const { isDarkMode } = useContext(ThemeContext);
  
  const baseStyle = "px-4 py-2.5 rounded-lg font-medium transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed";
  
  let variantStyle = "";
  if (variant === 'primary') {
    variantStyle = "bg-[var(--primary-color)] hover:opacity-90 text-white shadow-lg shadow-[var(--primary-color)]/20";
  } else if (variant === 'secondary') {
    variantStyle = isDarkMode 
      ? "bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700"
      : "bg-zinc-100 hover:bg-zinc-200 text-zinc-700 border border-zinc-200";
  } else if (variant === 'ghost') {
    variantStyle = isDarkMode
      ? "bg-transparent hover:bg-zinc-800 text-zinc-400 hover:text-white"
      : "bg-transparent hover:bg-zinc-100 text-zinc-500 hover:text-zinc-900";
  }

  return (
    <button onClick={onClick} disabled={disabled} className={`${baseStyle} ${variantStyle} ${className}`}>
      {children}
    </button>
  );
};

const Switch = ({ checked, onChange, label, icon: Icon }: any) => {
    const { isDarkMode } = useContext(ThemeContext);
    return (
        <div className={`flex items-center justify-between p-3 rounded-lg border transition-colors gap-4 ${
            isDarkMode ? 'bg-zinc-800/50 border-zinc-700' : 'bg-white border-zinc-200'
        }`}>
            <div className="flex items-center gap-2">
                 {Icon && <Icon size={16} className={checked ? "text-indigo-500" : "text-zinc-400"} />}
                 <span className={`text-xs font-bold ${isDarkMode ? 'text-zinc-300' : 'text-zinc-600'}`}>{label}</span>
            </div>
            <button
                onClick={() => onChange(!checked)}
                className={`w-10 h-5 rounded-full relative transition-colors duration-300 ${
                    checked ? 'bg-[var(--primary-color)]' : 'bg-zinc-300 dark:bg-zinc-600'
                }`}
            >
                <div className={`absolute top-1 left-1 w-3 h-3 rounded-full bg-white shadow-sm transition-transform duration-300 ${
                    checked ? 'translate-x-5' : 'translate-x-0'
                }`} />
            </button>
        </div>
    );
};

const ImageEditorModal = ({ isOpen, onClose, imageObject, onSave }: any) => {
  const { isDarkMode } = useContext(ThemeContext);
  const [instruction, setInstruction] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [resultImage, setResultImage] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen) {
      setInstruction('');
      setResultImage(null);
      setError('');
      setIsProcessing(false);
    }
  }, [isOpen, imageObject]);

  if (!isOpen || !imageObject) return null;

  const handleAiEdit = async () => {
    if (!instruction.trim()) {
        setError("请输入编辑指令");
        return;
    }
    setIsProcessing(true);
    setError('');
    setResultImage(null);

    try {
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
        const fileData = await fileToBase64(imageObject.file);
        
        const response = await ai.models.generateContent({
            model: IMAGE_MODEL,
            contents: [{
                parts: [
                    { text: instruction },
                    fileData
                ]
            }],
            config: {
                responseModalities: ["IMAGE" as any]
            }
        });

        const base64Image = response.candidates?.[0]?.content?.parts?.find(p => p.inlineData)?.inlineData?.data;

        if (base64Image) {
            setResultImage(`data:image/png;base64,${base64Image}`);
        } else {
            throw new Error("AI 未返回图片，请尝试修改指令");
        }

    } catch (err: any) {
        console.error(err);
        setError(err.message || "编辑失败");
    } finally {
        setIsProcessing(false);
    }
  };

  const handleApply = () => {
      if (resultImage) {
          const newFile = dataURLtoFile(resultImage, `edited_${imageObject.file.name}`);
          if (newFile) {
              const newImageObject = {
                  file: newFile,
                  preview: resultImage
              };
              onSave(newImageObject);
              onClose();
          }
      }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-black/60 backdrop-blur-sm p-4 pt-12 animate-fade-in print:hidden overflow-y-auto">
        <div className={`w-full max-w-4xl rounded-2xl overflow-hidden shadow-2xl flex flex-col my-auto ${isDarkMode ? 'bg-zinc-900 border border-zinc-800' : 'bg-white'}`}>
            <div className={`p-4 border-b flex justify-between items-center ${isDarkMode ? 'border-zinc-800' : 'border-zinc-100'}`}>
                <h3 className={`font-bold flex items-center gap-2 ${isDarkMode ? 'text-white' : 'text-zinc-800'}`}>
                    <Wand2 className="text-indigo-500" size={20}/> AI 智能修图
                </h3>
                <button onClick={onClose} className={`p-2 rounded-full hover:bg-opacity-10 ${isDarkMode ? 'hover:bg-white text-zinc-400' : 'hover:bg-black text-zinc-500'}`}>
                    <X size={20} />
                </button>
            </div>

            <div className="flex-1 p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="flex flex-col gap-2">
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>原图</span>
                        <div className={`relative rounded-xl overflow-hidden border aspect-square flex items-center justify-center bg-[url('https://res.cloudinary.com/dtz7hjpdb/image/upload/v1666627042/transparent-grid_v2_o8yxsj.png')] bg-repeat ${isDarkMode ? 'border-zinc-800' : 'border-zinc-200'}`}>
                            <img src={imageObject.preview} alt="Original" className="max-w-full max-h-full object-contain" />
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <span className={`text-[10px] font-bold uppercase tracking-wider ${isDarkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
                            {resultImage ? 'AI 修改后' : '预览区域'}
                        </span>
                        <div className={`relative rounded-xl overflow-hidden border aspect-square flex items-center justify-center bg-[url('https://res.cloudinary.com/dtz7hjpdb/image/upload/v1666627042/transparent-grid_v2_o8yxsj.png')] bg-repeat ${isDarkMode ? 'border-zinc-800' : 'border-zinc-200'}`}>
                            {isProcessing ? (
                                <div className="flex flex-col items-center gap-3">
                                    <Loader2 className="animate-spin text-indigo-500" size={32} />
                                    <span className="text-xs text-indigo-500 font-medium">AI 正在绘制...</span>
                                </div>
                            ) : resultImage ? (
                                <img src={resultImage} alt="Result" className="max-w-full max-h-full object-contain animate-fade-in" />
                            ) : (
                                <div className={`text-center p-6 ${isDarkMode ? 'text-zinc-600' : 'text-zinc-400'}`}>
                                    <Sparkles size={32} className="mx-auto mb-2 opacity-50" />
                                    <p className="text-xs">输入指令并点击生成，预览效果将在此显示</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className={`p-6 border-t ${isDarkMode ? 'bg-zinc-800/50 border-zinc-800' : 'bg-zinc-50 border-zinc-200'}`}>
                <div className="flex flex-col gap-4">
                    <div className="relative">
                        <input 
                            type="text" 
                            value={instruction}
                            onChange={(e) => setInstruction(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAiEdit()}
                            placeholder="请输入修改指令，例如：'移除桌子上的手机'..."
                            className={`w-full pl-4 pr-32 py-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all shadow-sm ${
                                isDarkMode ? 'bg-zinc-900 border-zinc-700 text-white' : 'bg-white border-zinc-300 text-zinc-800'
                            }`}
                        />
                        <button 
                            onClick={handleAiEdit}
                            disabled={isProcessing || !instruction.trim()}
                            className="absolute right-2 top-2 bottom-2 px-4 bg-[var(--primary-color)] hover:opacity-90 text-white rounded-lg text-xs font-bold transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                            {isProcessing ? <Loader2 className="animate-spin" size={14} /> : <Wand2 size={14} />}
                            生成
                        </button>
                    </div>
                    
                    <div className="flex justify-between items-center">
                        <span className="text-xs text-red-400 font-medium">{error}</span>
                        <div className="flex gap-3">
                            <Button variant="ghost" onClick={onClose}>取消</Button>
                            <Button 
                                onClick={handleApply} 
                                disabled={!resultImage} 
                                className="bg-[var(--primary-color)] hover:opacity-90 border-none shadow-lg shadow-[var(--primary-color)]/20"
                            >
                                <Check size={16} /> 应用修改
                            </Button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};

const ImageUploader = ({ label, maxFiles, images, setImages, icon: Icon, infoText, compact = false, themeColor = 'indigo', allowEdit = false, onEdit, placeholder = "点击上传", description = "支持 拖拽 / 粘贴" }: any) => {
  const { isDarkMode } = useContext(ThemeContext);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const colors: any = {
    indigo: { 
      border: isDarkMode ? 'border-indigo-500/20' : 'border-indigo-200',
      bg: isDarkMode ? 'bg-indigo-500/5' : 'bg-indigo-50/30',
      header: isDarkMode ? 'bg-indigo-500/10' : 'bg-indigo-50',
      text: 'text-indigo-500',
      ring: 'ring-indigo-500/10',
      upload: isDarkMode ? 'border-indigo-500/30 hover:bg-indigo-500/10' : 'border-indigo-200 hover:bg-indigo-50'
    },
    rose: { 
      border: isDarkMode ? 'border-rose-500/20' : 'border-rose-200',
      bg: isDarkMode ? 'bg-rose-500/5' : 'bg-rose-50/30',
      header: isDarkMode ? 'bg-rose-500/10' : 'bg-rose-50',
      text: 'text-rose-500',
      ring: 'ring-rose-500/10',
      upload: isDarkMode ? 'border-rose-500/30 hover:bg-rose-500/10' : 'border-rose-200 hover:bg-rose-50'
    },
    orange: { 
      border: isDarkMode ? 'border-orange-500/20' : 'border-orange-200',
      bg: isDarkMode ? 'bg-orange-500/5' : 'bg-orange-50/30',
      header: isDarkMode ? 'bg-orange-500/10' : 'bg-orange-50',
      text: 'text-orange-500',
      ring: 'ring-orange-500/10',
      upload: isDarkMode ? 'border-orange-500/30 hover:bg-orange-500/10' : 'border-orange-200 hover:bg-orange-50'
    },
    zinc: {
      border: isDarkMode ? 'border-zinc-800' : 'border-zinc-200',
      bg: isDarkMode ? 'bg-zinc-900/40' : 'bg-zinc-50/50',
      header: isDarkMode ? 'bg-zinc-800/50' : 'bg-zinc-100',
      text: isDarkMode ? 'text-zinc-400' : 'text-zinc-500',
      ring: 'ring-zinc-500/5',
      upload: isDarkMode ? 'border-zinc-800 hover:bg-zinc-800' : 'border-zinc-200 hover:bg-zinc-100'
    }
  };

  const theme = colors[themeColor] || colors.indigo;

  const processFiles = (newFiles: File[]) => {
    const imageFiles = newFiles.filter(file => file.type.startsWith('image/'));
    if (imageFiles.length === 0) return;
    if (images.length + imageFiles.length > maxFiles) {
      alert(`最多只能上传 ${maxFiles} 张图片`);
      return; 
    }
    const newImageObjects = imageFiles.map(file => ({
      file,
      preview: URL.createObjectURL(file)
    }));
    setImages((prev: any) => [...prev, ...newImageObjects]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) processFiles(Array.from(e.target.files));
  };

  const removeImage = (index: number) => {
    setImages((prev: any) => prev.filter((_: any, i: number) => i !== index));
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { 
    e.preventDefault(); 
    if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragging(false); 
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(Array.from(e.dataTransfer.files));
      e.dataTransfer.clearData();
    }
  };

  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      if (!isHovered) return;
      
      const items = Array.from(e.clipboardData?.items || []);
      const files = items
        .filter(item => item.kind === 'file' && item.type.startsWith('image/'))
        .map(item => item.getAsFile())
        .filter((file): file is File => file !== null);
      
      if (files.length > 0) {
        processFiles(files);
      }
    };

    window.addEventListener('paste', handleGlobalPaste);
    return () => window.removeEventListener('paste', handleGlobalPaste);
  }, [isHovered, images, maxFiles]);

  return (
    <div 
      className={`rounded-2xl border transition-all duration-500 overflow-hidden flex flex-col h-full w-full outline-none ${
        isDragging ? `ring-4 ${theme.ring} ${theme.border}` : `${theme.border} ${theme.bg}`
      } ${isHovered ? 'shadow-lg' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {label && (
        <div className={`px-4 py-3 flex justify-between items-center border-b shrink-0 ${theme.border} ${theme.header} min-h-[48px]`}>
          <label className={`text-[11px] font-bold flex items-center gap-2 whitespace-nowrap ${theme.text}`}>
            <Icon size={14} className="shrink-0" />
            <span>{label}</span>
            <span className="text-[10px] font-medium opacity-50 ml-1">
              ({images.length}/{maxFiles})
            </span>
          </label>
          {infoText && (
            <div className="group relative shrink-0">
              <Info size={12} className={isDarkMode ? "text-zinc-600" : "text-zinc-400"} />
              <div className={`absolute right-0 bottom-full mb-2 w-64 p-3 text-[10px] font-medium rounded-xl shadow-2xl border opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-1 group-hover:translate-y-0 pointer-events-none z-20 leading-relaxed ${
                isDarkMode ? 'bg-zinc-900 text-zinc-400 border-zinc-800' : 'bg-white text-zinc-500 border-zinc-100'
              }`}>
                {infoText}
              </div>
            </div>
          )}
        </div>
      )}

      <div className="p-3 flex-1 flex flex-col min-h-0 justify-center items-center">
        <div className={`grid ${compact ? 'grid-cols-1' : 'grid-cols-3'} gap-3 w-full h-full max-w-full items-center justify-items-center`}>
          {images.map((img: any, idx: number) => (
            <motion.div 
              key={idx} 
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className={`relative aspect-square w-full max-w-[280px] rounded-xl overflow-hidden group border transition-all duration-300 ${
                isDarkMode ? 'border-zinc-800 bg-zinc-950' : 'border-zinc-100 bg-white'
              }`}
            >
              <img src={img.preview} alt="upload" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                  <div className="absolute top-2 right-2 flex flex-col gap-1.5 pointer-events-auto">
                      {allowEdit && (
                          <button
                              onClick={(e) => { e.stopPropagation(); onEdit(img, idx); }}
                              className={`p-1.5 rounded-lg transition-all duration-300 border backdrop-blur-md ${
                                isDarkMode 
                                  ? 'bg-zinc-900/80 border-zinc-700 text-zinc-400 hover:bg-indigo-600 hover:text-white hover:border-indigo-500' 
                                  : 'bg-white/90 border-zinc-200 text-zinc-500 hover:bg-indigo-600 hover:text-white hover:border-indigo-500 shadow-sm'
                              }`}
                              title="AI 智能编辑"
                          >
                              <Wand2 size={14} />
                          </button>
                      )}
                      <button
                          onClick={(e) => { e.stopPropagation(); removeImage(idx); }}
                          className={`p-1.5 rounded-lg transition-all duration-300 border backdrop-blur-md ${
                            isDarkMode 
                              ? 'bg-zinc-900/80 border-zinc-700 text-zinc-400 hover:bg-red-600 hover:text-white hover:border-red-500' 
                              : 'bg-white/90 border-zinc-200 text-zinc-500 hover:bg-red-600 hover:text-white hover:border-red-500 shadow-sm'
                          }`}
                          title="删除"
                      >
                          <Trash2 size={14} />
                      </button>
                  </div>
              </div>
            </motion.div>
          ))}
          
          {images.length < maxFiles && (
            <motion.div 
              layout
              onClick={() => fileInputRef.current?.click()}
              className={`aspect-square w-full max-w-[280px] rounded-xl border-2 border-dashed transition-all duration-300 cursor-pointer flex flex-col items-center justify-center group ${theme.upload} ${theme.text}`}
            >
              <div className={`p-3.5 rounded-full transition-colors duration-300 ${isDarkMode ? 'bg-zinc-800' : 'bg-zinc-100'} group-hover:bg-opacity-50`}>
                {Icon ? <Icon size={22} className={`transition-transform duration-500 ${isDragging ? 'scale-110' : 'group-hover:scale-110'}`} /> : <Upload size={22} className={`transition-transform duration-500 ${isDragging ? 'scale-110' : 'group-hover:scale-110'}`} />}
              </div>
              <span className="text-[12px] font-bold mt-4 whitespace-nowrap">{placeholder}</span>
              <span className="text-[10px] font-medium opacity-50 mt-1 whitespace-nowrap">{description}</span>
            </motion.div>
          )}
        </div>
      </div>
      <input type="file" ref={fileInputRef} onChange={handleFileChange} multiple accept="image/*" className="hidden" />
    </div>
  );
};

const PromptCard = ({ title, prompt, translation, type, onOptimize, onRefresh }: any) => {
  const { isDarkMode } = useContext(ThemeContext);
  const [copied, setCopied] = useState(false);
  const [showOptimize, setShowOptimize] = useState(false);
  const [optimizeInstruction, setOptimizeInstruction] = useState('');
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(prompt).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleExport = () => {
    const content = `方案标题: ${title}\n类型: ${type === 'main' ? '主图' : type === 'detail' ? '细节/卖点' : '场景/Lifestyle'}\n\n中文释义:\n${translation}\n\nEnglish Prompt:\n${prompt}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title}_方案导出.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSubmitOptimize = async () => {
    if(!optimizeInstruction.trim()) return;
    setIsOptimizing(true);
    await onOptimize(optimizeInstruction);
    setIsOptimizing(false);
    setShowOptimize(false);
    setOptimizeInstruction('');
  };

  const handleRefreshClick = async () => {
    setIsRefreshing(true);
    await onRefresh();
    setIsRefreshing(false);
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`group border rounded-[2rem] p-6 transition-all duration-500 break-inside-avoid print:break-inside-avoid print:bg-white print:border-gray-300 ${
        isDarkMode 
          ? 'bg-zinc-900/40 border-zinc-800/50 hover:border-indigo-500/30' 
          : 'bg-white border-zinc-200 hover:border-indigo-500/30 shadow-xl shadow-zinc-200/30'
      }`}
    >
      <div className="flex justify-between items-start mb-6 print:mb-2">
        <div className="flex items-center gap-3">
          <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest print:border print:border-zinc-300 print:text-black ${
            type === 'main' ? 'bg-indigo-500/10 text-indigo-500' :
            type === 'detail' ? 'bg-indigo-500/10 text-indigo-500' :
            'bg-indigo-500/10 text-indigo-500'
          }`}>
            {type === 'main' ? '主图' : type === 'detail' ? '细节/卖点' : '场景/Lifestyle'}
          </div>
          <h4 className={`text-lg font-bold tracking-tight print:text-black ${isDarkMode ? 'text-zinc-100' : 'text-zinc-900'}`}>{title}</h4>
        </div>
        <div className="flex gap-2 print:hidden opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <button 
             onClick={handleRefreshClick}
             disabled={isRefreshing}
             className={`transition-all duration-300 p-2 rounded-xl border ${
               isRefreshing 
                 ? 'animate-spin text-indigo-500 border-indigo-500/20' 
                 : isDarkMode 
                   ? 'text-zinc-500 border-zinc-800 hover:text-indigo-400 hover:border-indigo-500/30 hover:bg-indigo-500/5' 
                   : 'text-zinc-400 border-zinc-100 hover:text-indigo-600 hover:border-indigo-500/30 hover:bg-indigo-50'
             }`}
             title="微调刷新"
          >
             <RotateCw size={18} />
          </button>
          <button 
            onClick={() => setShowOptimize(!showOptimize)} 
            className={`transition-all duration-300 p-2 rounded-xl border ${
              showOptimize 
                ? 'text-indigo-500 border-indigo-500 bg-indigo-500/10' 
                : isDarkMode 
                  ? 'text-zinc-500 border-zinc-800 hover:text-indigo-400 hover:border-indigo-500/30 hover:bg-indigo-500/5' 
                  : 'text-zinc-400 border-zinc-100 hover:text-indigo-600 hover:border-indigo-500/30 hover:bg-indigo-50'
            }`}
            title="AI 优化"
          >
             <Sparkles size={18} />
          </button>
          <button 
            onClick={handleCopy} 
            className={`transition-all duration-300 p-2 rounded-xl border ${
              isDarkMode 
                ? 'text-zinc-500 border-zinc-800 hover:text-zinc-300 hover:bg-zinc-800' 
                : 'text-zinc-400 border-zinc-100 hover:text-zinc-600 hover:bg-zinc-50'
            }`}
          >
            {copied ? <Check size={18} className="text-emerald-500" /> : <Copy size={18} />}
          </button>
          <button 
            onClick={handleExport} 
            className={`transition-all duration-300 p-2 rounded-xl border ${
              isDarkMode 
                ? 'text-zinc-500 border-zinc-800 hover:text-zinc-300 hover:bg-zinc-800' 
                : 'text-zinc-400 border-zinc-100 hover:text-zinc-600 hover:bg-zinc-50'
            }`}
            title="导出方案"
          >
            <Download size={18} />
          </button>
        </div>
      </div>

      {showOptimize && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className={`mb-6 p-4 rounded-2xl animate-fade-in print:hidden ${
            isDarkMode ? 'bg-indigo-900/10 border border-indigo-500/20' : 'bg-indigo-50/50 border border-indigo-100'
          }`}
        >
           <label className={`block text-[11px] font-bold uppercase tracking-widest mb-3 ${isDarkMode ? 'text-indigo-400' : 'text-indigo-600'}`}>优化指令</label>
           <div className="flex gap-3">
             <input 
               type="text" 
               value={optimizeInstruction}
               onChange={(e) => setOptimizeInstruction(e.target.value)}
               placeholder="例如：将背景改为海滩，增加暖色调..."
               className={`flex-1 text-sm p-3 rounded-xl border focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all ${
                 isDarkMode ? 'bg-zinc-950 border-zinc-800 text-zinc-200' : 'bg-white border-zinc-200 text-zinc-800'
               }`}
               onKeyDown={(e) => e.key === 'Enter' && handleSubmitOptimize()}
             />
             <Button 
               onClick={handleSubmitOptimize} 
               disabled={isOptimizing || !optimizeInstruction.trim()}
               className="py-2 px-5 text-xs font-bold rounded-xl h-auto"
               variant="primary"
             >
               {isOptimizing ? <RefreshCw className="animate-spin" size={14} /> : '执行'}
             </Button>
           </div>
        </motion.div>
      )}

      {translation && (
        <div className={`mb-6 p-4 rounded-2xl text-sm leading-relaxed border-l-4 font-medium print:border-indigo-500 print:bg-white print:text-black ${
           isDarkMode 
             ? 'bg-indigo-500/5 border-indigo-500/30 text-indigo-200/80' 
             : 'bg-indigo-50/30 border-indigo-500/20 text-indigo-900'
        }`}>
          <span className="text-[10px] font-bold uppercase tracking-widest mr-2 opacity-50">中文释义</span>
          {translation}
        </div>
      )}

      <div className={`relative group/prompt rounded-2xl border transition-all duration-300 ${
        isDarkMode 
          ? 'bg-zinc-950/50 border-zinc-800/50 group-hover:border-indigo-500/20' 
          : 'bg-zinc-50/50 border-zinc-100 group-hover:border-indigo-500/20'
      }`}>
        <p className={`text-xs font-mono leading-relaxed break-words p-5 select-all print:bg-white print:text-black print:border-gray-300 ${
          isDarkMode ? 'text-zinc-400' : 'text-zinc-600'
        }`}>
          {prompt}
        </p>
        <div className="absolute top-3 right-3 opacity-0 group-hover/prompt:opacity-100 transition-opacity">
          <div className={`px-2 py-1 rounded-md text-[9px] font-bold uppercase tracking-tighter ${
            isDarkMode ? 'bg-zinc-900 text-zinc-600' : 'bg-white text-zinc-400 shadow-sm'
          }`}>
            English Prompt
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const THEME_PALETTES = [
  { name: '经典靛蓝', color: '#4f46e5', secondary: '#818cf8' },
  { name: '极简深灰', color: '#3f3f46', secondary: '#71717a' },
  { name: '科技深蓝', color: '#0369a1', secondary: '#38bdf8' },
  { name: '奢华金棕', color: '#854d0e', secondary: '#fbbf24' },
  { name: '活力橙红', color: '#ea580c', secondary: '#fb923c' },
  { name: '清新森绿', color: '#15803d', secondary: '#4ade80' },
];

export default function App() {
  const [isDarkMode, setIsDarkMode] = useState(false); 
  const [primaryColor, setPrimaryColor] = useState('#4f46e5'); // Default indigo-600
  const [showPalette, setShowPalette] = useState(false);
  
  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  const [images, setImages] = useState<any[]>([]);
  const [productImages, setProductImages] = useState<any[]>([]); 
  const [showProductUpload, setShowProductUpload] = useState(false); 
  const [colorImages, setColorImages] = useState<any[]>([]);
  const [showColorUpload, setShowColorUpload] = useState(false);
  const [instruction, setInstruction] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any[]>([]); 
  const [editorState, setEditorState] = useState<any>({ isOpen: false, imageIndex: null, imageObject: null });
  const [remixModel, setRemixModel] = useState(MODEL_OPTIONS[0]);
  const [selectedRatio, setSelectedRatio] = useState(ASPECT_RATIOS[0]);
  const [sceneWeight, setSceneWeight] = useState(COMPOSITION_WEIGHTS[1]);
  const [colorWeight, setColorWeight] = useState(COLOR_FUSION_WEIGHTS[1]);
  
  const [suggestedProps, setSuggestedProps] = useState('');
  const [isAutoPropsMode, setIsAutoPropsMode] = useState(false);
  const [isUnifiedSceneMode, setIsUnifiedSceneMode] = useState(false);
  
  const resultsRef = useRef<HTMLDivElement>(null);

  const handleOpenEditor = (imageObject: any, index: number) => {
      setEditorState({ isOpen: true, imageIndex: index, imageObject: imageObject });
  };

  const handleSaveEditedImage = (newImageObject: any) => {
      setImages(prev => {
          const newImages = [...prev];
          if (editorState.imageIndex !== null) {
              newImages[editorState.imageIndex] = newImageObject;
          }
          return newImages;
      });
  };

  const enforceSuffix = (data: any) => {
      const suffix = selectedRatio.value;
      if (remixModel.id === 'midjourney') {
          if (data.content_zh && !data.content_zh.includes(suffix)) {
              data.content_zh = `${data.content_zh} ${suffix}`;
          }
          if (data.content && !data.content.includes(suffix)) {
              data.content = `${data.content} ${suffix}`;
          }
      }
      return data;
  };

  const handleRemixRefresh = async (index: number) => {
      const currentItem = result[index];
      if (!currentItem) return;

      try {
          const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
          const requiredStyleSuffix = "bright, high-key, commercial, soft natural light, clear and bright, sunny, soft flattering diffused high-key lighting, creating a clean and comfortable atmosphere, clear noise-free digital texture, reflecting a clear, happy, bright commercial lifestyle photography style, highly realistic, authentic, photorealistic, not artificial, professional photography, sharp details.";
          
          let formatInstructions = "";
          if (remixModel.id === 'midjourney') {
            formatInstructions = `
              **MIDJOURNEY FORMATTING RULES (STRICT)**:
              1. **MANDATORY SUFFIX**: The prompt MUST end with EXACTLY this string: "${selectedRatio.value}"
              2. **STRUCTURE**: [Subject] + [Environment] + [Lighting/Atmosphere] + [Camera/Lens] + "${requiredStyleSuffix}" + ${selectedRatio.value}
            `;
          } else {
            formatInstructions = `Append: "${requiredStyleSuffix}"`;
          }

          const hasProduct = showProductUpload && productImages.length > 0;
          const colorFusionInstruction = hasProduct ? (
              colorWeight.id === 'contrast' ? "**COLOR STRATEGY (CONTRAST)**: Analyze product color and use complementary or high-contrast colors for the environment and props to make the product pop out sharply." :
              colorWeight.id === 'natural' ? "**COLOR STRATEGY (NATURAL)**: Create a scene that *subtly echoes* the product's color palette. The background and props should use *analogous colors* or *soft tints* of the product's main color. **CRITICAL**: Avoid artificial matching. Use natural materials (wood, stone, fabric) in these colors to ensure realism." :
              "**COLOR STRATEGY (MONOCHROMATIC)**: Extract the product's main color and force the environment, walls, background, and all props to match this exact color scheme for a high-end monochromatic commercial look."
          ) : "";

          const systemInstruction = `
              You are a creative Art Director acting as a REFINER.
              Goal: Create a subtle VARIATION of the provided prompt.
              Target Model: ${remixModel.name}.
              Original Prompt: "${currentItem.content}"
              
              **CORE PRINCIPLE: THE FUSION LOGIC**
              1. **DNA EXTRACTION & REFERENCING**: 
                 - **CRITICAL RULE**: You are STRICTLY FORBIDDEN from describing the product's specific appearance (color, shape, material names, etc.).
                 - Use ONLY the placeholder: "the [Scale] product from the Product Image".
              2. **COLOR FUSION STRATEGY**:
                 ${colorFusionInstruction}
              3. **GLOBAL LIGHTING RULE**:
                 - ALWAYS append: "${requiredStyleSuffix}".
                 - STRICTLY FORBID: "dark, shadow, cinematic, moody, low-key, noise, film grain".
              
              ${formatInstructions}
              
              FOCUS entirely on the lighting, environment, and composition.
              **LANGUAGE ENFORCEMENT**:
              - The 'content' field MUST be in **ENGLISH**.
              - The 'content_zh' field MUST be in **SIMPLIFIED CHINESE**.

              OUTPUT FORMAT (Strict JSON):
              {
                  "title": "Short Title in Simplified Chinese",
                  "content": "New English prompt...",
                  "content_zh": "Simplified Chinese translation..."
              }
          `;

          const response = await ai.models.generateContent({
              model: TEXT_MODEL,
              contents: [{ parts: [{ text: "Generate a refined variation." }] }],
              config: {
                  systemInstruction,
                  responseMimeType: "application/json"
              }
          });

          let parsed = JSON.parse(response.text || "{}");
          const newItem = enforceSuffix(parsed);

          setResult(prev => {
              const newArr = [...prev];
              newArr[index] = newItem;
              return newArr;
          });

      } catch (err) {
          console.error("Remix Refresh error:", err);
          alert("刷新失败，请重试");
      }
  };

  const handleRemixOptimize = async (index: number, optimizeInstruction: string) => {
      const currentItem = result[index];
      if (!currentItem) return;

      try {
          const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
          const requiredStyleSuffix = "bright, high-key, commercial, soft natural light, clear and bright, sunny, soft flattering diffused high-key lighting, creating a clean and comfortable atmosphere, clear noise-free digital texture, reflecting a clear, happy, bright commercial lifestyle photography style, highly realistic, authentic, photorealistic, not artificial, professional photography, sharp details.";
          
          let formatInstructions = "";
          if (remixModel.id === 'midjourney') {
            formatInstructions = `
              **MIDJOURNEY FORMATTING RULES (STRICT)**:
              1. **MANDATORY SUFFIX**: The prompt MUST end with EXACTLY this string: "${selectedRatio.value}"
              2. **STRUCTURE**: [Subject] + [Environment] + [Lighting/Atmosphere] + [Camera/Lens] + "${requiredStyleSuffix}" + ${selectedRatio.value}
            `;
          } else {
            formatInstructions = `Append: "${requiredStyleSuffix}"`;
          }

          const hasProduct = showProductUpload && productImages.length > 0;
          const colorFusionInstruction = hasProduct ? (
              colorWeight.id === 'contrast' ? "**COLOR STRATEGY (CONTRAST)**: Analyze product color and use complementary or high-contrast colors for the environment and props to make the product pop out sharply." :
              colorWeight.id === 'natural' ? "**COLOR STRATEGY (NATURAL)**: Create a scene that *subtly echoes* the product's color palette. The background and props should use *analogous colors* or *soft tints* of the product's main color. **CRITICAL**: Avoid artificial matching. Use natural materials (wood, stone, fabric) in these colors to ensure realism." :
              "**COLOR STRATEGY (MONOCHROMATIC)**: Extract the product's main color and force the environment, walls, background, and all props to match this exact color scheme for a high-end monochromatic commercial look."
          ) : "";

          const systemInstruction = `
              You are a prompt editor. 
              Goal: Rewrite the provided prompt based on the user's specific instruction.
              Target Model: ${remixModel.name}.
              Original Prompt: "${currentItem.content}"
              User Instruction: "${optimizeInstruction}"
              
              **CORE PRINCIPLE: THE FUSION LOGIC**
              1. **DNA EXTRACTION & REFERENCING**: 
                 - **CRITICAL RULE**: You are STRICTLY FORBIDDEN from describing the product's specific appearance (color, shape, material names, etc.).
                 - Use ONLY the placeholder: "the [Scale] product from the Product Image".
              2. **COLOR FUSION STRATEGY**:
                 ${colorFusionInstruction}
              3. **GLOBAL LIGHTING RULE**:
                 - ALWAYS append: "${requiredStyleSuffix}".
                 - STRICTLY FORBID: "dark, shadow, cinematic, moody, low-key, noise, film grain".
              
              ${formatInstructions}
              
              FOCUS entirely on the lighting, environment, and composition.
              **LANGUAGE ENFORCEMENT**:
              - The 'content' field MUST be in **ENGLISH**.
              - The 'content_zh' field MUST be in **SIMPLIFIED CHINESE**.

              OUTPUT FORMAT (Strict JSON):
              {
                  "title": "Short Title in Simplified Chinese",
                  "content": "New English prompt...",
                  "content_zh": "Simplified Chinese translation..."
              }
          `;

          const response = await ai.models.generateContent({
              model: TEXT_MODEL,
              contents: [{ parts: [{ text: "Please rewrite the prompt." }] }],
              config: {
                  systemInstruction,
                  responseMimeType: "application/json"
              }
          });

          let parsed = JSON.parse(response.text || "{}");
          const newItem = enforceSuffix(parsed);

          setResult(prev => {
              const newArr = [...prev];
              newArr[index] = newItem;
              return newArr;
          });

      } catch (err) {
          console.error("Remix Optimization error:", err);
          alert("优化失败，请重试");
      }
  };

  const getModeLabel = () => {
      const hasScene = images.length > 0;
      const hasProduct = showProductUpload && productImages.length > 0;
      const hasColor = showColorUpload && colorImages.length > 0;
      const hasInstruction = instruction.trim().length > 0;

      const activeImagesCount = (hasScene ? 1 : 0) + (hasProduct ? 1 : 0) + (hasColor ? 1 : 0);
      if (activeImagesCount === 0) return "请上传素材...";
      
      if (hasScene && !hasProduct && !hasColor) return hasInstruction ? "模式一：场景重绘" : "等待指令...";
      if (hasScene && hasProduct && !hasColor) return hasInstruction ? "模式三：深度定制" : "模式二：自动融合";
      if (!hasScene && hasProduct && !hasColor) return hasInstruction ? "模式四：产品生图" : "等待指令...";
      if (hasScene && hasColor && !hasProduct) return "模式五：色彩与场景融合";
      if (hasScene && hasColor && hasProduct) return "模式六：全能混合魔改";
      if (!hasScene && hasColor) return "色彩主题参考";
      
      return "自由定制模式";
  };

  const handleGenerate = async () => {
    const hasScene = images.length > 0;
    const hasProduct = showProductUpload && productImages.length > 0;
    const hasColor = showColorUpload && colorImages.length > 0;
    const hasInstruction = instruction.trim().length > 0;

    if (!hasScene && !hasProduct && !hasColor) {
      alert("请至少上传一张图片（场景图、产品图、或色调参考图）。");
      return;
    }

    setLoading(true);
    setResult([]);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      let sceneParts = hasScene ? await Promise.all(images.map(img => fileToBase64(img.file))) : [];
      let productParts = hasProduct ? await Promise.all(productImages.map(img => fileToBase64(img.file))) : [];
      let colorParts = hasColor ? await Promise.all(colorImages.map(img => fileToBase64(img.file))) : [];
      
      const requiredStyleSuffix = "bright, high-key, commercial, soft natural light, clear and bright, sunny, soft flattering diffused high-key lighting, creating a clean and comfortable atmosphere, clear noise-free digital texture, reflecting a clear, happy, bright commercial lifestyle photography style, highly realistic, authentic, photorealistic, not artificial, professional photography, sharp details.";

      let taskDescription = "**TASK OVERVIEW**:\nAnalyze inputs and generate prompt variations.\n\n";
      if (hasScene) taskDescription += "1. **[Base Scene Image]**: MASTER TEMPLATE for composition and poses.\n";
      if (hasProduct) taskDescription += "2. **[Product Image]**: Specific object to insert. Analyze its Scale and Vibe.\n";
      if (hasColor) taskDescription += "3. **[Color Reference Image]**: MASTER PALETTE.\n";
      if (hasInstruction) taskDescription += `4. **[Instruction]**: "${instruction}"\n`;

      let formatInstructions = remixModel.id === 'midjourney' 
        ? `**MIDJOURNEY FORMATTING RULES**: 1. MANDATORY SUFFIX: "${selectedRatio.value}" 2. STRUCTURE: [Subject] + [Environment] + [Lighting] + "${requiredStyleSuffix}" + ${selectedRatio.value}`
        : `**NANO BANANA RULES**: Natural language, append: "${requiredStyleSuffix}"`;

      const compositionInstruction = isUnifiedSceneMode
          ? `**UNIFIED COMPOSITION MODE**: Scheme 1 is the ANCHOR. Schemes 2 and 3 MUST ABSOLUTELY ALIGN with Scheme 1's camera angle, perspective, and character poses. Only background, lighting, props, and clothing can change.`
          : (sceneWeight.id === 'high' 
              ? "**STRICT COMPOSITION**: Lock camera angle, perspective, subject position, and character poses exactly as in the Base Scene Image. Do not change them." 
              : sceneWeight.id === 'medium' 
                ? "**MEDIUM COMPOSITION**: Keep core layout but RELAX character poses to be more natural and candid. **CRITICAL**: Avoid stiff, mannequin-like postures. Characters should look like they are in motion or comfortably interacting with the environment."
                : "**DYNAMIC COMPOSITION**: Free to significantly change camera angles and layout.");

      const propsInstruction = isAutoPropsMode
          ? "**AUTO PROPS (LOGICAL SET DESIGNER)**: 1. Analyze the product's category and the scene's activity. 2. Select 3-5 props that are *functionally* and *narratively* linked to both. 3. Place them in a way that creates a 'lived-in' but clean look. 4. Ensure props interact with the product logically (e.g., if it's a drink, place it on a coaster; if it's a gadget, place it near a workspace). 5. Avoid generic or random items. Every prop must tell a part of the story."
          : (suggestedProps ? `PROPS POOL: "${suggestedProps}"` : "Imagine simple, clean props.");
      
      const colorFusionInstruction = hasProduct ? (
          colorWeight.id === 'contrast' ? "**COLOR STRATEGY (CONTRAST)**: Analyze product color and use complementary or high-contrast colors for the environment and props to make the product pop out sharply." :
          colorWeight.id === 'natural' ? "**COLOR STRATEGY (NATURAL)**: Create a scene that *subtly echoes* the product's color palette. The background and props should use *analogous colors* or *soft tints* of the product's main color. **CRITICAL**: Avoid artificial matching. Use natural materials (wood, stone, fabric) in these colors to ensure realism." :
          "**COLOR STRATEGY (MONOCHROMATIC)**: Extract the product's main color and force the environment, walls, background, and all props to match this exact color scheme for a high-end monochromatic commercial look."
      ) : "";

      const systemInstruction = `
        You are an advanced AI Art Director and Prompt Engineer. TARGET MODEL: ${remixModel.name}
        
        **CORE PRINCIPLE: THE FUSION LOGIC (IMAGE-TO-IMAGE)**
        1. **DNA EXTRACTION & REFERENCING**: 
           - Analyze the [Product Image] to determine its "Scale" (Small/Medium/Large) and "Vibe".
           - **CRITICAL RULE**: You are STRICTLY FORBIDDEN from describing the product's specific appearance (color, shape, material names, etc.) in the prompt.
           - Use ONLY the placeholder: "the [Scale] product from the Product Image".
           - This ensures the AI locks onto the image features without text interference.
        
        2. **VISUAL ECHO & INTEGRATION**:
           - The scene must "react to the product". 
           - Analyze the product's material (wood, metal, matte, glossy, etc.) and add corresponding lighting, environment reflections, or shadows in the scene description to make it look physically integrated.

        3. **SCENE NARRATIVE & EVENT ANALYSIS (CRITICAL)**:
           - **MANDATORY**: Analyze the *activity*, *interaction*, or *event* occurring in the [Base Scene Image] (e.g., a business meeting, a birthday party, a couple arguing, a solitary break).
           - The generated prompt MUST describe this action explicitly.
           - The product placement must make sense within this *story*. Don't just place it; integrate it into the *moment*.

        4. **COLOR FUSION STRATEGY**:
           ${colorFusionInstruction}
        
        5. **COMPOSITION & VIEWPOINT**:
           ${compositionInstruction}
        
        6. **AUTO PROPS**:
           ${propsInstruction}
        
        7. **GLOBAL LIGHTING & REALISM RULE**:
           - ALWAYS append: "${requiredStyleSuffix}".
           - **REALISM ENFORCEMENT**: The scene must look like a real photograph, not a digital render. Ensure natural skin textures, realistic material physics (wood grain, fabric weave, glass refraction), and authentic light-and-shadow interactions. Avoid "plastic" or "perfect" surfaces.
           - STRICTLY FORBID: "dark, shadow, cinematic, moody, low-key, 3d render, cgi, plastic skin, noise, film grain, artificial, fake, over-processed".
           - **POSE INSTRUCTION**: Ensure all characters have relaxed, candid, and natural poses. Avoid stiff, mannequin-like postures.
        
        **MISSION: GENERATE 3 DISTINCT SCHEMES**
        - **方案 1: 核心场景方案**: Strictly follow the user's instruction and the Base Scene Image.
        - **方案 2: 户外自然方案**: Move the scene to an outdoor setting (park, beach, or street). Change characters' clothing to outdoor wear. Add matching outdoor props.
        - **方案 3: 节日庆典方案**: Change the scene to a party or gathering. **CRITICAL**: All balloons, ribbons, and decorations MUST perfectly match the core color of the product.
        
        ${formatInstructions}
        ${taskDescription}
        
        **LANGUAGE ENFORCEMENT**:
        - The 'content' field MUST be in **ENGLISH**.
        - The 'content_zh' field MUST be in **SIMPLIFIED CHINESE**.

        OUTPUT FORMAT: JSON { "results": [ { "title": "...", "content": "...", "content_zh": "..." } ] }
      `;

      const contentsParts: any[] = [];
      contentsParts.push({ text: hasInstruction ? `INSTRUCTION: "${instruction}"` : "INSTRUCTION: Auto-Fuse" });
      if (hasScene) { contentsParts.push({ text: "--- BASE SCENE ---" }); contentsParts.push(...sceneParts); }
      if (hasProduct) { contentsParts.push({ text: "--- PRODUCT ---" }); contentsParts.push(...productParts); }
      if (hasColor) { contentsParts.push({ text: "--- COLOR ---" }); contentsParts.push(...colorParts); }

      const response = await ai.models.generateContent({
        model: TEXT_MODEL,
        contents: [{ role: 'user', parts: contentsParts }],
        config: {
          systemInstruction,
          responseMimeType: "application/json"
        }
      });

      let parsed = JSON.parse(response.text || "{}");
      let finalResults = parsed.results || (Array.isArray(parsed) ? parsed : [parsed]);

      if (remixModel.id === 'midjourney' && selectedRatio) {
          finalResults = finalResults.map((item: any) => enforceSuffix(item));
      }

      setResult(finalResults);
      setTimeout(() => resultsRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);

    } catch (err: any) {
      console.error(err);
      alert("生成失败，请重试。" + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExportAll = () => {
    if (result.length === 0) return;
    let content = "# AI Scene Remix & Product Fusion Studio - 方案导出\n\n";
    result.forEach((item, idx) => {
      content += `## 方案 ${idx + 1}: ${item.title}\n`;
      content += `**中文释义**:\n${item.content_zh}\n\n`;
      content += `**English Prompt**:\n\`\`\`\n${item.content}\n\`\`\`\n\n`;
      content += "---\n\n";
    });
    const blob = new Blob([content], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `全套魔改方案导出_${new Date().toLocaleDateString()}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
      <div className={`min-h-screen font-sans transition-colors duration-500 print:bg-white print:text-black ${
        isDarkMode ? 'bg-[#0a0a0a] text-zinc-300' : 'bg-[#f8f9fa] text-zinc-700'
      }`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 animate-fade-in print:p-0 print:max-w-none">
          <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6 print:hidden">
             <motion.div 
               initial={{ opacity: 0, x: -20 }}
               animate={{ opacity: 1, x: 0 }}
               className="space-y-1"
             >
               <h1 className={`text-3xl font-bold tracking-tight flex items-center gap-3 ${isDarkMode ? 'text-white' : 'text-zinc-900'}`}>
                 <div className="p-2 bg-[var(--primary-color)] rounded-lg shadow-lg shadow-[var(--primary-color)]/20">
                    <Palette className="text-white" size={24} />
                 </div>
                 场景魔改 & 产品植入工作室
               </h1>
               <p className={`text-sm font-medium ${isDarkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
                 Professional Scene Remix & Product Fusion Studio
               </p>
             </motion.div>
             
             <div className="flex items-center gap-4">
                 <div className="relative">
                    <button 
                      onClick={() => setShowPalette(!showPalette)}
                      className={`p-2.5 rounded-xl transition-all duration-300 ${
                        showPalette
                          ? 'bg-[var(--primary-color)] text-white shadow-lg shadow-[var(--primary-color)]/20 border-[var(--primary-color)]'
                          : isDarkMode 
                            ? 'bg-zinc-900 text-zinc-400 hover:bg-zinc-800 border border-zinc-800' 
                            : 'bg-white text-zinc-600 hover:bg-zinc-50 border border-zinc-200 shadow-sm'
                      }`}
                      title="自定义配色"
                    >
                      <Palette size={20} />
                    </button>
                    
                    <ColorPalette 
                      isOpen={showPalette} 
                      onClose={() => setShowPalette(false)}
                      primaryColor={primaryColor}
                      setPrimaryColor={setPrimaryColor}
                      isDarkMode={isDarkMode}
                    />
                 </div>
                 <motion.div 
                   initial={{ opacity: 0, scale: 0.9 }}
                   animate={{ opacity: 1, scale: 1 }}
                   className={`px-4 py-2 rounded-full border text-xs font-bold tracking-wide uppercase ${
                     isDarkMode 
                       ? 'bg-zinc-900/50 border-zinc-800 text-[var(--primary-color)]' 
                       : 'bg-white border-zinc-200 text-[var(--primary-color)] shadow-sm'
                   }`}
                 >
                    {getModeLabel()}
                 </motion.div>
                 <button 
                   onClick={toggleTheme} 
                   className={`p-2.5 rounded-xl transition-all duration-300 ${
                     isDarkMode 
                       ? 'bg-zinc-900 text-yellow-400 hover:bg-zinc-800 border border-zinc-800' 
                       : 'bg-white text-zinc-600 hover:bg-zinc-50 border border-zinc-200 shadow-sm'
                   }`}
                 >
                  {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                </button>
             </div>
          </header>

          <main className="grid grid-cols-1 lg:grid-cols-12 gap-10 print:block">
             <div className="lg:col-span-5 space-y-8 print:hidden">
                {/* Upload Section */}
                <section className={`p-6 rounded-3xl border transition-all duration-300 ${
                  isDarkMode 
                    ? 'bg-zinc-900/40 border-zinc-800/50 backdrop-blur-sm' 
                    : 'bg-white border-zinc-200 shadow-xl shadow-zinc-200/50'
                }`}>
                   <div className="mb-6 flex justify-between items-center">
                      <h3 className={`font-bold text-lg flex items-center gap-2 ${isDarkMode ? 'text-zinc-100' : 'text-zinc-800'}`}>
                        <ImageIcon size={20} className="text-indigo-500"/> 素材库
                      </h3>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setShowColorUpload(!showColorUpload)} 
                          className={`text-[10px] font-bold px-3 py-1.5 rounded-full border transition-all ${
                            showColorUpload 
                              ? 'bg-rose-500 border-rose-500 text-white shadow-lg shadow-rose-500/20' 
                              : isDarkMode ? 'border-zinc-800 text-zinc-500 hover:bg-zinc-800' : 'border-zinc-200 text-zinc-400 hover:bg-zinc-50'
                          }`}
                        >
                          配色参考
                        </button>
                        <button 
                          onClick={() => setShowProductUpload(!showProductUpload)} 
                          className={`text-[10px] font-bold px-3 py-1.5 rounded-full border transition-all flex items-center gap-1.5 ${
                            showProductUpload 
                              ? 'bg-orange-500 border-orange-500 text-white shadow-lg shadow-orange-500/20' 
                              : isDarkMode ? 'border-zinc-800 text-zinc-500 hover:bg-zinc-800' : 'border-zinc-200 text-zinc-400 hover:bg-zinc-50'
                          }`}
                        >
                          <Plus size={12} />
                          植入产品
                        </button>
                      </div>
                   </div>
                   
                   <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                      <div className="flex flex-col h-full">
                        <ImageUploader 
                          label="场景底图"
                          maxFiles={1} 
                          images={images} 
                          setImages={setImages} 
                          icon={Layout} 
                          compact={true} 
                          allowEdit={true} 
                          onEdit={handleOpenEditor}
                          themeColor="indigo"
                          placeholder="上传底图"
                          description="构图参考"
                        />
                      </div>
                      {showColorUpload && (
                        <div className="animate-fade-in flex flex-col h-full">
                          <ImageUploader 
                            label="配色参考"
                            maxFiles={1} 
                            images={colorImages} 
                            setImages={setColorImages} 
                            icon={Palette} 
                            compact={true} 
                            themeColor="rose" 
                            placeholder="上传配色"
                            description="色调参考"
                          />
                        </div>
                      )}
                      {showProductUpload && (
                        <div className="animate-fade-in flex flex-col h-full">
                          <ImageUploader 
                            label="植入产品"
                            maxFiles={1} 
                            images={productImages} 
                            setImages={setProductImages} 
                            icon={Box} 
                            compact={true} 
                            themeColor="orange" 
                            placeholder="上传产品"
                            description="植入参考"
                          />
                        </div>
                      )}
                   </div>

                   {((images.length > 0 && (showProductUpload || showColorUpload)) || (showProductUpload && productImages.length > 0)) && (
                       <div className={`mt-8 pt-6 border-t ${isDarkMode ? 'border-zinc-800' : 'border-zinc-100'}`}>
                           <div className="space-y-4">
                               <label className={`text-[11px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>场景构图参考力度</label>
                               <div className="flex gap-2">
                                   {COMPOSITION_WEIGHTS.map(w => (
                                       <button 
                                         key={w.id} 
                                         onClick={() => setSceneWeight(w)} 
                                         className={`flex-1 text-[11px] font-bold py-2.5 rounded-xl border transition-all ${
                                           sceneWeight.id === w.id 
                                             ? 'bg-[var(--primary-color)] border-[var(--primary-color)] text-white shadow-lg shadow-[var(--primary-color)]/20' 
                                             : isDarkMode ? 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:bg-zinc-800' : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                                         }`}
                                       >
                                         {w.label}
                                       </button>
                                   ))}
                               </div>
                           </div>

                           {showProductUpload && productImages.length > 0 && (
                               <div className="space-y-4 mt-6">
                                   <label className={`text-[11px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>色彩与环境融合策略</label>
                                   <div className="flex gap-2">
                                       {COLOR_FUSION_WEIGHTS.map(w => (
                                           <button 
                                             key={w.id} 
                                             onClick={() => setColorWeight(w)} 
                                             className={`flex-1 text-[11px] font-bold py-2.5 rounded-xl border transition-all ${
                                               colorWeight.id === w.id 
                                                 ? 'bg-orange-600 border-orange-600 text-white shadow-lg shadow-orange-600/20' 
                                                 : isDarkMode ? 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:bg-zinc-800' : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                                             }`}
                                             title={w.desc}
                                           >
                                             {w.label.split(' ')[0]}
                                           </button>
                                       ))}
                                   </div>
                                   <p className={`text-[10px] italic ${isDarkMode ? 'text-zinc-600' : 'text-zinc-400'}`}>{colorWeight.desc}</p>
                               </div>
                           )}
                       </div>
                   )}
                </section>

                {/* Configuration Section */}
                <section className={`p-6 rounded-3xl border transition-all duration-300 ${
                  isDarkMode 
                    ? 'bg-zinc-900/40 border-zinc-800/50 backdrop-blur-sm' 
                    : 'bg-white border-zinc-200 shadow-xl shadow-zinc-200/50'
                }`}>
                   <div className="space-y-8">
                     {/* Model & Toggle */}
                     <div>
                        <div className="flex justify-between items-center mb-4">
                            <label className={`text-[11px] font-bold uppercase tracking-widest ${isDarkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>渲染引擎</label>
                            <Switch checked={isUnifiedSceneMode} onChange={setIsUnifiedSceneMode} label="统一构图" icon={Link} />
                        </div>
                        <div className="flex gap-2">
                          {MODEL_OPTIONS.map(m => (
                            <button 
                              key={m.id} 
                              onClick={() => setRemixModel(m)} 
                              className={`flex-1 text-[11px] font-bold py-3 rounded-xl border transition-all ${
                                remixModel.id === m.id 
                                  ? 'bg-[var(--primary-color)] border-[var(--primary-color)] text-white shadow-lg shadow-[var(--primary-color)]/20' 
                                  : isDarkMode ? 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:bg-zinc-800' : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                              }`}
                            >
                              {m.name}
                            </button>
                          ))}
                        </div>
                     </div>

                     {/* Ratio */}
                     {remixModel.id === 'midjourney' && (
                       <div className="animate-fade-in">
                          <label className={`text-[11px] font-bold uppercase tracking-widest mb-4 block ${isDarkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>输出比例</label>
                          <div className="flex gap-2">
                            {ASPECT_RATIOS.map(r => (
                              <button 
                                key={r.id} 
                                onClick={() => setSelectedRatio(r)} 
                                className={`flex-1 text-[11px] font-bold py-3 rounded-xl border flex flex-col items-center gap-2 transition-all ${
                                  selectedRatio.id === r.id 
                                    ? 'bg-[var(--primary-color)] border-[var(--primary-color)] text-white shadow-lg shadow-[var(--primary-color)]/20' 
                                    : isDarkMode ? 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:bg-zinc-800' : 'bg-white border-zinc-200 text-zinc-600 hover:bg-zinc-50'
                                }`}
                              >
                                  <r.icon size={16} />
                                  <span>{r.name.split(' ')[0]}</span>
                              </button>
                            ))}
                          </div>
                       </div>
                     )}

                     {/* Auto Props */}
                     <div className={`p-4 rounded-2xl border transition-colors ${
                       isDarkMode 
                         ? 'bg-indigo-900/10 border-indigo-500/20' 
                         : 'bg-indigo-50/50 border-indigo-100'
                     }`}>
                        <Switch checked={isAutoPropsMode} onChange={setIsAutoPropsMode} label="AI 智能道具分析" icon={Lightbulb} />
                        {!isAutoPropsMode && (
                          <textarea 
                            value={suggestedProps} 
                            onChange={(e) => setSuggestedProps(e.target.value)} 
                            placeholder="手动输入推荐道具 (如: 干花, 咖啡杯...)" 
                            className={`w-full h-16 text-xs bg-transparent mt-3 border-t pt-3 focus:outline-none resize-none ${
                              isDarkMode ? 'border-indigo-500/20 text-indigo-300' : 'border-indigo-200 text-indigo-700'
                            }`} 
                          />
                        )}
                     </div>

                     {/* Instruction */}
                     <div>
                        <label className={`text-sm font-bold flex items-center gap-2 mb-4 ${isDarkMode ? 'text-zinc-100' : 'text-zinc-800'}`}>
                          <Zap size={18} className="text-yellow-400" /> 魔改指令 (Prompt Instruction)
                        </label>
                        <textarea 
                          value={instruction} 
                          onChange={(e) => setInstruction(e.target.value)} 
                          placeholder="输入您的创意指令，例如：'将背景改为极简主义北欧风格'..." 
                          className={`w-full h-32 rounded-2xl p-4 text-sm resize-none focus:outline-none transition-all ${
                            isDarkMode 
                              ? 'bg-zinc-950 border border-zinc-800 text-zinc-200 focus:border-indigo-500/50' 
                              : 'bg-zinc-50 border border-zinc-200 text-zinc-800 focus:border-indigo-500/50'
                          }`} 
                        />
                     </div>

                     <Button 
                       onClick={handleGenerate} 
                       disabled={loading} 
                       className="w-full py-4 rounded-2xl bg-gradient-to-r from-[var(--primary-color)] to-[var(--primary-color)] hover:opacity-90 border-none shadow-xl shadow-[var(--primary-color)]/20 transition-all duration-300 active:scale-[0.98]"
                     >
                       {loading ? <RefreshCw className="animate-spin" size={20} /> : <Sparkles size={20} />} 
                       <span className="text-base font-bold">{loading ? '正在重构创意...' : '生成魔改方案'}</span>
                     </Button>
                   </div>
                </section>
             </div>

             {/* Results Section */}
             <div className="lg:col-span-7 print:w-full" ref={resultsRef}>
                <AnimatePresence mode="wait">
                  {result.length > 0 ? (
                    <motion.div 
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="space-y-6"
                    >
                       <div className={`p-6 rounded-3xl border-l-4 border-l-emerald-500 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:hidden ${
                         isDarkMode ? 'bg-zinc-900/40 border-zinc-800/50' : 'bg-white border-zinc-200 shadow-lg shadow-zinc-200/50'
                       }`}>
                          <div>
                            <h3 className={`font-bold text-lg flex items-center gap-2 ${isDarkMode ? 'text-zinc-100' : 'text-zinc-800'}`}>
                              <Check size={24} className="text-emerald-500" /> 方案生成完毕
                            </h3>
                            <p className={`text-sm font-medium ${isDarkMode ? 'text-zinc-500' : 'text-zinc-400'}`}>
                              已为您定制 {result.length} 套专业级提示词方案
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button 
                              onClick={handleExportAll} 
                              variant="secondary" 
                              className="text-xs font-bold h-10 px-6 rounded-xl"
                            >
                              <Download size={16} /> 导出全套
                            </Button>
                          </div>
                       </div>
                       
                       <div className="space-y-6">
                         {result.map((item, idx) => (
                             <PromptCard 
                               key={idx} 
                               title={item.title} 
                               prompt={item.content} 
                               translation={item.content_zh} 
                               onOptimize={(ins: string) => handleRemixOptimize(idx, ins)} 
                               onRefresh={() => handleRemixRefresh(idx)} 
                             />
                         ))}
                       </div>
                    </motion.div>
                  ) : (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={`h-[600px] flex flex-col items-center justify-center rounded-[2.5rem] border-2 border-dashed transition-all duration-500 print:hidden ${
                        isDarkMode 
                          ? 'border-zinc-800 bg-zinc-900/20 text-zinc-700' 
                          : 'border-zinc-200 bg-zinc-50/50 text-zinc-400'
                      }`}
                    >
                       <div className={`p-8 rounded-full mb-6 ${isDarkMode ? 'bg-zinc-900' : 'bg-white shadow-xl shadow-zinc-200/50'}`}>
                          <Palette size={64} className="opacity-20" />
                       </div>
                       <p className="text-lg font-bold tracking-tight">
                          {loading ? "AI 正在深度重构您的创意..." : "等待创意输入"}
                       </p>
                       <p className="text-sm font-medium opacity-60 mt-2 max-w-xs text-center leading-relaxed">
                          {loading ? "正在分析光影结构与材质特征，请稍候" : "在左侧上传素材并输入指令，我们将为您生成专业级提示词方案"}
                       </p>
                    </motion.div>
                  )}
                </AnimatePresence>
             </div>
          </main>
          
          <ImageEditorModal 
            isOpen={editorState.isOpen} 
            imageObject={editorState.imageObject} 
            onClose={() => setEditorState({ ...editorState, isOpen: false })} 
            onSave={handleSaveEditedImage} 
          />
        </div>
      </div>
    </ThemeContext.Provider>
  );
};
