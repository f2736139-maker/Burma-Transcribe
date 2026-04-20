import { useState, useRef, FormEvent, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  UploadCloud,
  Link as LinkIcon,
  FileVideo,
  Loader2,
  Copy,
  CheckCircle2,
  AlertCircle,
  X,
  PlaySquare,
  Key
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

// Define the aistudio window property
declare global {
  interface Window {
    aistudio?: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Custom App modifications
export default function App() {
  const [activeTab, setActiveTab] = useState<'upload' | 'link'>('upload');
  const [file, setFile] = useState<File | null>(null);
  const [url, setUrl] = useState('');
  const [userApiKey, setUserApiKey] = useState('');
  
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [transcript, setTranscript] = useState('');
  const [copied, setCopied] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile.type.startsWith('video/')) {
        setFile(droppedFile);
        setStatus('idle');
      } else {
        setStatus('error');
        setMessage('Please drop a valid video file.');
      }
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!userApiKey) {
        setStatus('error');
        setMessage('Please enter your Gemini API Key directly into the field.');
        return;
    }

    if (activeTab === 'upload' && !file) return;
    if (activeTab === 'link' && !url) return;

    setStatus('loading');
    setMessage(activeTab === 'upload' ? 'Uploading and processing video...' : 'Downloading and processing video...');
    setTranscript('');

    const formData = new FormData();
    formData.append('apiKey', userApiKey);
    if (activeTab === 'upload' && file) {
      formData.append('videoFile', file);
    } else if (activeTab === 'link') {
      formData.append('videoUrl', url);
    }

    try {
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to process video.');
      }

      setTranscript(data.transcript);
      setStatus('success');
      setMessage('Transcription complete!');
    } catch (err: any) {
      setStatus('error');
      setMessage(err.message || 'An unexpected error occurred.');
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(transcript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-[#f8f7f4] text-[#1a1a1a] font-sans flex flex-col relative z-10 overflow-x-hidden">
      <nav className="h-20 border-b border-black/10 px-6 md:px-12 flex items-center justify-between shrink-0 bg-[#f8f7f4] relative z-20">
        <div className="flex items-center gap-3">
          <motion.div 
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="w-8 h-8 bg-black rounded-full flex items-center justify-center shrink-0"
          >
            <div className="w-3 h-3 bg-[#f8f7f4] rotate-45"></div>
          </motion.div>
          <span className="text-lg md:text-xl font-bold tracking-tighter uppercase whitespace-nowrap">BurmaTranscribe</span>
        </div>
        <div className="hidden md:flex gap-8 text-[11px] font-semibold uppercase tracking-widest">
          <span className="border-b border-black pb-0.5 cursor-pointer">Dashboard</span>
          <span className="opacity-40 hover:opacity-100 transition-opacity cursor-pointer">History</span>
          <span className="opacity-40 hover:opacity-100 transition-opacity cursor-pointer">API Docs</span>
        </div>
      </nav>

      <main className="flex-1 grid md:grid-cols-12 gap-0 items-stretch h-full min-h-[calc(100vh-5rem)]">
        <aside className="md:col-span-5 lg:col-span-4 border-r border-black/10 p-6 md:p-12 flex flex-col justify-start bg-white/30 h-full relative z-10">
          <header className="mb-10">
            <motion.h1 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-5xl lg:text-5xl xl:text-6xl font-light leading-tight md:leading-none tracking-tight font-serif italic mb-6 text-black"
            >
              Extract<br />the Voice.
            </motion.h1>
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="text-[10px] md:text-xs font-bold opacity-50 uppercase tracking-widest leading-[1.6] max-w-sm mb-6"
            >
              Accurately transcribe & translate audio from any video into Myanmar (Burmese).
            </motion.p>
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-black/10 text-[10px] font-bold uppercase tracking-widest"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              Engine Active
            </motion.div>
          </header>

          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="w-full flex-1 flex flex-col"
          >
            {/* Tabs */}
            <div className="flex gap-6 mb-8 border-b border-black/5 pb-2">
              <button
                onClick={() => setActiveTab('upload')}
                className={cn(
                  "flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest pb-2 transition-all relative",
                  activeTab === 'upload' ? "text-black" : "text-black/40 hover:text-black/80"
                )}
              >
                <UploadCloud size={14} />
                File Upload
                {activeTab === 'upload' && <span className="absolute bottom-[-2px] left-0 w-full h-[2px] bg-black" />}
              </button>
              <button
                onClick={() => setActiveTab('link')}
                className={cn(
                  "flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest pb-2 transition-all relative",
                  activeTab === 'link' ? "text-black" : "text-black/40 hover:text-black/80"
                )}
              >
                <LinkIcon size={14} />
                Direct Link
                {activeTab === 'link' && <span className="absolute bottom-[-2px] left-0 w-full h-[2px] bg-black" />}
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8 flex-1">
              {/* API Key Input */}
              <div className="mb-6 bg-white/50 p-4 rounded-xl border border-black/5">
                <label className="block">
                  <span className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold mb-3 opacity-80 text-black">
                    <Key size={12} />
                    Your Gemini API Key
                  </span>
                  <input
                    type="password"
                    value={userApiKey}
                    onChange={(e) => setUserApiKey(e.target.value)}
                    placeholder="AIzaSy..."
                    required
                    className="w-full bg-transparent border-b border-black/20 pb-2 text-sm focus:outline-none focus:border-black transition-colors"
                  />
                  <p className="text-[9px] font-bold uppercase tracking-widest opacity-40 mt-3 flex items-center">
                    <AlertCircle size={10} className="mr-1 inline align-text-bottom" />
                    Required for 3.1 Pro translation access
                  </p>
                </label>
              </div>

              <AnimatePresence mode="wait">
                {activeTab === 'upload' ? (
                  <motion.div
                    key="upload"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4"
                  >
                    <div 
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className={cn(
                        "group relative border-2 border-dashed rounded-2xl p-8 text-center transition-all cursor-pointer bg-white/50 flex flex-col items-center justify-center gap-3",
                        file ? "border-black/40" : "border-black/10 hover:border-black/30"
                      )}
                    >
                      <input 
                        type="file" 
                        accept="video/*" 
                        className="hidden" 
                        ref={fileInputRef}
                        onChange={(e) => {
                          if (e.target.files?.[0]) setFile(e.target.files[0]);
                        }}
                      />
                      
                      {file ? (
                        <>
                          <div className="p-3 bg-black/5 text-black rounded-full">
                            <FileVideo size={24} />
                          </div>
                          <div>
                            <p className="text-black font-bold text-sm tracking-tight break-all">{file.name}</p>
                            <p className="text-black/50 text-[10px] uppercase font-bold tracking-widest mt-1">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                          </div>
                          <button 
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setFile(null); }}
                            className="text-red-500/80 hover:text-red-600 text-[10px] font-bold uppercase tracking-widest flex items-center mt-2 border border-red-200 bg-red-50 px-3 py-1.5 rounded-full"
                          >
                            <X size={14} className="mr-1" /> Remove
                          </button>
                        </>
                      ) : (
                        <>
                          <div className="text-3xl mb-1 text-black/40 group-hover:text-black/60 transition-colors">+</div>
                          <p className="text-[11px] font-bold opacity-60 uppercase tracking-widest">Drop Video File</p>
                          <p className="text-[10px] opacity-40 uppercase tracking-wide mt-1">MP4, MOV, AVI up to 2GB</p>
                        </>
                      )}
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="link"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4"
                  >
                    <label className="block">
                      <span className="block text-[10px] uppercase tracking-widest font-bold mb-3 opacity-50">Video URL</span>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 flex items-center pointer-events-none opacity-40">
                          <LinkIcon size={16} />
                        </div>
                        <input
                          type="url"
                          placeholder="Paste direct media link..."
                          value={url}
                          onChange={(e) => setUrl(e.target.value)}
                          className="w-full bg-transparent border-b border-black/20 pl-7 pb-3 text-sm focus:outline-none focus:border-black transition-colors placeholder:text-black/30"
                          required={activeTab === 'link'}
                        />
                      </div>
                      <p className="text-[10px] text-black/40 mt-4 font-bold tracking-widest uppercase leading-relaxed opacity-60">
                        Direct files work best.
                      </p>
                    </label>
                  </motion.div>
                )}
              </AnimatePresence>

              <button
                type="submit"
                disabled={status === 'loading' || !userApiKey || (activeTab === 'upload' && !file) || (activeTab === 'link' && !url)}
                className={cn(
                  "w-full py-4 mt-6 flex items-center justify-center gap-3 rounded-full text-[11px] font-bold uppercase tracking-[0.2em] transition-all shadow-xl shadow-black/10",
                  status === 'loading' || !userApiKey || (activeTab === 'upload' && !file) || (activeTab === 'link' && !url)
                    ? "bg-black/10 text-black/40 cursor-not-allowed shadow-none"
                    : "bg-black text-white hover:scale-[0.98]"
                )}
              >
                {status === 'loading' ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Processing...
                  </>
                ) : (
                  'Generate Transcript'
                )}
              </button>

              {/* Status Message */}
              <AnimatePresence>
                {status !== 'idle' && (
                  <motion.div 
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="overflow-hidden mt-4"
                  >
                    <div className={cn(
                      "p-4 rounded-xl flex items-start gap-3 border text-xs font-bold tracking-wide uppercase",
                      status === 'loading' && "bg-black/5 border-black/10 text-black/70",
                      status === 'error' && "bg-red-50 border-red-200 text-red-800",
                      status === 'success' && "bg-emerald-50 border-emerald-200 text-emerald-800"
                    )}>
                      {status === 'loading' && <Loader2 size={16} className="animate-spin mt-0.5 flex-shrink-0" />}
                      {status === 'success' && <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0" />}
                      {status === 'error' && <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />}
                      <span>{message}</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </form>
            
            {/* Optional Metadata area */}
            <section className="space-y-4 pt-10 mt-auto border-t border-black/5 hidden md:block">
              <div className="flex justify-between items-end border-b border-black/5 pb-2">
                <span className="text-[10px] uppercase font-bold tracking-widest opacity-40">Target Language</span>
                <span className="text-sm font-serif italic text-black/80">Myanmar (Standard)</span>
              </div>
              <div className="flex justify-between items-end border-b border-black/5 pb-2">
                <span className="text-[10px] uppercase font-bold tracking-widest opacity-40">Precision</span>
                <span className="text-sm font-serif italic text-black/80">Gemini 3.1 Pro Engine</span>
              </div>
            </section>
          </motion.div>
        </aside>

        {/* Output Column */}
        <section className="md:col-span-7 lg:col-span-8 flex flex-col relative p-6 md:p-12 mb-10 md:mb-0 max-h-[100vh] lg:max-h-[calc(100vh-5rem)]">
          {/* Vertical Branding Text */}
          <div className="hidden lg:block absolute right-8 top-1/2 -translate-y-1/2 [writing-mode:vertical-rl] rotate-180 text-[10px] uppercase tracking-[0.5em] font-bold opacity-10 pointer-events-none">
            Intelligence • Accuracy • Preservation
          </div>

          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="flex-1 flex flex-col w-full h-full"
          >
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl md:text-3xl font-serif italic text-black">Current Transcript</h2>
              <div className="flex gap-2">
                {transcript && (
                  <button 
                    onClick={handleCopy}
                    className="px-5 py-2 md:py-2.5 bg-transparent border border-black/20 text-black rounded-full text-[10px] font-bold uppercase tracking-widest hover:bg-black hover:text-white hover:border-black transition-all flex items-center gap-2"
                  >
                    {copied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                )}
              </div>
            </div>

            {/* Transcript Viewport */}
            <div className="flex-1 overflow-y-auto bg-white border border-black/5 rounded-3xl p-6 md:p-12 shadow-sm relative z-10">
              {transcript ? (
                <div className="space-y-8 pr-4">
                  <div className="prose prose-p:leading-[1.8] md:prose-p:leading-[2] prose-p:text-base md:prose-p:text-lg prose-p:font-serif prose-p:text-[#333] prose-headings:font-sans max-w-none break-words">
                    <ReactMarkdown>{transcript}</ReactMarkdown>
                  </div>
                </div>
              ) : (
                <div className="h-full min-h-[300px] flex flex-col items-center justify-center text-center text-black/40 p-8 space-y-6">
                  <div className="w-20 h-20 rounded-full border border-black/10 flex items-center justify-center bg-black/5 text-3xl">
                    <span className="opacity-50">🇲🇲</span>
                  </div>
                  <p className="font-serif italic text-base md:text-lg max-w-xs">Your beautifully formatted Myanmar translation will appear here.</p>
                </div>
              )}
            </div>
            
            {/* Status Bar for processing */}
            {status === 'loading' && (
              <div className="mt-8 flex items-center gap-4 w-full max-w-md mx-auto xl:max-w-none">
                <div className="h-1 bg-black/5 flex-1 rounded-full overflow-hidden relative">
                  <motion.div 
                    initial={{ left: '-10%', width: '10%' }}
                    animate={{ left: '100%', width: '30%' }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                    className="absolute h-full bg-black/40" 
                  />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-60">Syncing Engine Data</span>
              </div>
            )}
          </motion.div>
        </section>
      </main>
    </div>
  );
}
