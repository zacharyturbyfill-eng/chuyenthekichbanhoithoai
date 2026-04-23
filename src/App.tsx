/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import { transformToScript } from './services/aiService';
import { 
  FileText, 
  Sparkles, 
  Copy, 
  Check, 
  Loader2, 
  Stethoscope, 
  Video, 
  History,
  Trash2,
  AlertCircle,
  Mic
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { motion, AnimatePresence } from 'motion/react';

interface SavedScript {
  id: string;
  title: string;
  content: string;
  date: string;
}

export default function App() {
  const [inputText, setInputText] = useState('');
  const [script, setScript] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [history, setHistory] = useState<SavedScript[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [useCustomDoctor, setUseCustomDoctor] = useState(false);
  const [doctorName, setDoctorName] = useState('');
  const outputRef = useRef<HTMLDivElement>(null);

  const handleTransform = async () => {
    if (!inputText.trim()) return;
    
    setIsLoading(true);
    setError(null);
    try {
      const result = await transformToScript(inputText, useCustomDoctor ? doctorName : undefined);
      setScript(result);
      
      // Save to history
      const newScript: SavedScript = {
        id: Date.now().toString(),
        title: inputText.slice(0, 40) + '...',
        content: result,
        date: new Date().toLocaleString('vi-VN'),
      };
      setHistory(prev => [newScript, ...prev].slice(0, 10));
      
      // Scroll to output
      setTimeout(() => {
        outputRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (format: 'standard' | 'tts') => {
    if (!script) return;

    // 1. Find the first section marker to discard the outline/intro text
    const firstMarkerIndex = script.indexOf('---SECTION_START:');
    let scriptContent = firstMarkerIndex !== -1 ? script.substring(firstMarkerIndex) : script;

    // 2. Remove all section markers
    let cleanLines = scriptContent
      .replace(/---SECTION_START: (?:PHẦN \d+|PHẦN CUỐI)---/g, '')
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0);

    let finalContent = '';

    if (format === 'standard') {
      finalContent = cleanLines.join('\n');
    } else {
      // Format 2: Mapping speakers to #1, #2, #3...
      const speakerMap: Record<string, string> = {};
      let nextId = 1;

      const scriptLines = cleanLines.map(line => {
        const match = line.match(/^([^:：]+)[:：]/);
        if (match) {
          const speakerName = match[1].trim();
          if (!speakerMap[speakerName]) {
            speakerMap[speakerName] = `#${nextId++}`;
          }
          return line.replace(/^[^:：]+[:：]/, speakerMap[speakerName]);
        }
        return line;
      });

      // Create a mapping header to help user identify speakers
      const mappingHeader = [
        '--- DANH SÁCH NHÂN VẬT ---',
        ...Object.entries(speakerMap).map(([name, id]) => `${id}: ${name}`),
        '--------------------------',
        '',
        ''
      ].join('\n');

      finalContent = mappingHeader + scriptLines.join('\n');
    }

    navigator.clipboard.writeText(finalContent);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const renderScript = () => {
    if (!script) return null;

    const sections = script.split(/(---SECTION_START: (?:PHẦN \d+|PHẦN CUỐI)---)/);
    
    return (
      <div className="space-y-6">
        {sections.map((part, index) => {
          if (part.startsWith('---SECTION_START:')) {
            const title = part.replace('---SECTION_START: ', '').replace('---', '');
            return (
              <div key={index} className="flex items-center gap-2 mt-8 mb-2 select-none">
                <div className="h-px flex-1 bg-gray-100"></div>
                <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">{title}</span>
                <div className="h-px flex-1 bg-gray-100"></div>
              </div>
            );
          }
          return (
            <div key={index} className="whitespace-pre-wrap leading-relaxed text-gray-700">
              <ReactMarkdown>{part.trim()}</ReactMarkdown>
            </div>
          );
        })}
      </div>
    );
  };

  const clearHistory = () => {
    if (confirm('Bạn có chắc chắn muốn xóa lịch sử?')) {
      setHistory([]);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#1A1A1A] font-sans">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-black/5">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-200">
              <Stethoscope size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">HealthScript AI</h1>
              <p className="text-[10px] uppercase tracking-widest text-emerald-600 font-semibold">Chuyên gia biên kịch sức khỏe</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button 
              onClick={() => outputRef.current?.scrollIntoView({ behavior: 'smooth' })}
              className="text-sm font-medium text-gray-500 hover:text-emerald-600 transition-colors"
            >
              Kịch bản mới
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Input & Controls */}
        <div className="lg:col-span-7 space-y-6">
          <section className="bg-white rounded-2xl p-6 shadow-sm border border-black/5">
            <div className="flex items-center gap-2 mb-4">
              <FileText size={20} className="text-emerald-600" />
              <h2 className="font-semibold">Văn bản nguồn</h2>
            </div>
            <textarea
              className="w-full h-64 p-4 rounded-xl bg-gray-50 border border-gray-200 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200 outline-none transition-all resize-none text-sm leading-relaxed"
              placeholder="Dán nội dung audio text hoặc câu chuyện sức khỏe vào đây..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />
            <div className="mt-4 space-y-4">
              <div className="flex items-center gap-4 bg-gray-50 p-3 rounded-xl border border-gray-100">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={useCustomDoctor}
                    onChange={(e) => setUseCustomDoctor(e.target.checked)}
                    className="w-4 h-4 accent-emerald-600"
                  />
                  <span className="text-sm font-medium text-gray-700">Tên bác sĩ tùy chỉnh</span>
                </label>
                {useCustomDoctor && (
                  <input 
                    type="text"
                    placeholder="Nhập tên bác sĩ (VD: Vũ Bá An)"
                    value={doctorName}
                    onChange={(e) => setDoctorName(e.target.value)}
                    className="flex-1 px-3 py-1.5 rounded-lg border border-gray-200 text-sm focus:border-emerald-500 outline-none"
                  />
                )}
              </div>

              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-400">
                  {inputText.length} ký tự | {inputText.split(/\s+/).filter(Boolean).length} từ
                </p>
                <button
                  onClick={handleTransform}
                  disabled={isLoading || !inputText.trim()}
                  className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all shadow-lg ${
                    isLoading || !inputText.trim() 
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                    : 'bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95 shadow-emerald-200'
                  }`}
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={20} className="animate-spin" />
                      Đang chuyển thể...
                    </>
                  ) : (
                    <>
                      <Sparkles size={20} />
                      Chuyển thể kịch bản
                    </>
                  )}
                </button>
              </div>
            </div>
          </section>

          {/* Error Message */}
          <AnimatePresence>
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-red-50 border border-red-100 p-4 rounded-xl flex items-center gap-3 text-red-600 text-sm"
              >
                <AlertCircle size={18} />
                {error}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Loading States */}
          <AnimatePresence>
            {isLoading && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="bg-emerald-50 border border-emerald-100 p-8 rounded-2xl text-center space-y-4"
              >
                <div className="flex justify-center">
                  <div className="relative">
                    <div className="w-16 h-16 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
                    <Sparkles className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-emerald-600" size={24} />
                  </div>
                </div>
                <div className="space-y-2">
                  <h3 className="font-bold text-emerald-900">AI đang phân tích ý chính...</h3>
                  <p className="text-sm text-emerald-700 max-w-xs mx-auto">
                    Chúng tôi đang xây dựng nhân vật, hội thoại và lồng ghép lời khuyên chuyên gia cho bạn.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Output Area */}
          <div ref={outputRef}>
            <AnimatePresence>
              {script && !isLoading && (
                <motion.section 
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-2xl shadow-xl border border-black/5 overflow-hidden"
                >
                  <div className="bg-gray-50 px-6 py-4 border-b border-black/5 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Video size={20} className="text-emerald-600" />
                      <h2 className="font-bold">Kịch bản Video Hoàn thiện</h2>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCopy('standard')}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-gray-200 text-xs font-medium hover:bg-gray-50 transition-all"
                      >
                        {isCopied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
                        {isCopied ? 'Đã chép!' : 'Chép (Tên:)'}
                      </button>
                      <button
                        onClick={() => handleCopy('tts')}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs font-medium hover:bg-emerald-100 transition-all"
                      >
                        {isCopied ? <Check size={14} /> : <Mic size={14} />}
                        {isCopied ? 'Đã chép!' : 'Chép (#ID)'}
                      </button>
                    </div>
                  </div>
                  <div className="p-8 prose prose-emerald max-w-none prose-sm sm:prose-base">
                    {renderScript()}
                  </div>
                </motion.section>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Right Column: History & Stats */}
        <div className="lg:col-span-5 space-y-6">
          <section className="bg-white rounded-2xl p-6 shadow-sm border border-black/5">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <History size={20} className="text-gray-400" />
                <h2 className="font-semibold">Lịch sử chuyển thể</h2>
              </div>
              {history.length > 0 && (
                <button 
                  onClick={clearHistory}
                  className="text-gray-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>

            <div className="space-y-3">
              {history.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-gray-100 rounded-xl">
                  <p className="text-sm text-gray-400">Chưa có kịch bản nào được tạo</p>
                </div>
              ) : (
                history.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => {
                      setScript(item.content);
                      outputRef.current?.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="w-full text-left p-4 rounded-xl border border-gray-100 hover:border-emerald-200 hover:bg-emerald-50/30 transition-all group"
                  >
                    <h3 className="text-sm font-medium line-clamp-1 group-hover:text-emerald-700">{item.title}</h3>
                    <p className="text-[10px] text-gray-400 mt-1">{item.date}</p>
                  </button>
                ))
              )}
            </div>
          </section>

          <section className="bg-emerald-900 rounded-2xl p-6 text-white shadow-lg shadow-emerald-900/20">
            <h3 className="font-bold mb-4 flex items-center gap-2">
              <Sparkles size={18} />
              Mẹo cho kịch bản hay
            </h3>
            <ul className="space-y-3 text-sm text-emerald-100/80">
              <li className="flex gap-2">
                <span className="text-emerald-400 font-bold">•</span>
                Cung cấp đầy đủ các ý chính về triệu chứng và giải pháp.
              </li>
              <li className="flex gap-2">
                <span className="text-emerald-400 font-bold">•</span>
                Nêu rõ đối tượng khán giả mục tiêu (ví dụ: người già, dân văn phòng).
              </li>
              <li className="flex gap-2">
                <span className="text-emerald-400 font-bold">•</span>
                AI sẽ tự động tạo nhân vật dựa trên ngữ cảnh bạn cung cấp.
              </li>
            </ul>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-6xl mx-auto px-4 py-12 border-t border-black/5 text-center">
        <p className="text-sm text-gray-400">© 2026 HealthScript AI Transformer. Sức khỏe là vàng.</p>
      </footer>
    </div>
  );
}
