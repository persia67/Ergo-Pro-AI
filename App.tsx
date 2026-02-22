
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  calculateREBA, 
  calculateRULA, 
  calculateOWAS, 
  calculateNIOSH, 
  generateCorrections, 
  METHOD_METADATA, 
  REBA_FIELDS, 
  RULA_FIELDS, 
  OWAS_FIELDS,
  getTodayShamsi
} from './constants';
import { MethodType, Correction, Language, Theme, AssessmentMetadata, AssessmentSession } from './types';
import { analyzePostureFromImage } from './geminiService';

// --- Sub-components ---

const SliderField: React.FC<{ 
  field: any; 
  fieldKey: string; 
  value: number; 
  onChange: (key: string, val: number) => void;
  lang: Language;
}> = ({ field, fieldKey, value, onChange, lang }) => {
  const label = lang === 'en' ? field.labelEn : field.labelFa;
  const descriptions = lang === 'en' ? field.en : field.fa;
  const help = lang === 'en' ? field.helpEn : field.helpFa;

  return (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-2">
        <label className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">{label}</label>
        <span className="bg-blue-500/10 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded text-sm font-bold border border-blue-500/30">{value}</span>
      </div>
      <input 
        type="range" 
        min={field.min} 
        max={field.max} 
        step={1} 
        value={value} 
        onChange={(e) => onChange(fieldKey, parseInt(e.target.value))}
        className="w-full h-1.5 bg-slate-300 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500 transition-all"
      />
      <div className="flex justify-between mt-2">
        {descriptions.map((desc: string, i: number) => (
          <div key={i} className="text-[9px] text-slate-500 dark:text-slate-500 leading-tight text-center px-1" style={{ width: `${100/descriptions.length}%` }}>
            <span className={value === (field.min + i) ? "text-blue-600 dark:text-blue-400 font-bold" : ""}>
              {desc}
            </span>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-slate-400 dark:text-slate-600 mt-2 italic">{help}</p>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [method, setMethod] = useState<MethodType>('REBA');
  const [formData, setFormData] = useState<any>({});
  const [image, setImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiObservations, setAiObservations] = useState<string>("");
  const [lang, setLang] = useState<Language>('fa');
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('ergo_theme') as Theme) || 'dark');
  const [statusMessage, setStatusMessage] = useState<{ text: string, type: 'success' | 'error' | 'info' } | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  
  // Metadata Persistence
  const [metadata, setMetadata] = useState<AssessmentMetadata>(() => {
    const lastAssessor = localStorage.getItem('ergo_last_assessor') || '';
    return {
      jobTitle: '',
      assessor: lastAssessor,
      evalee: '',
      date: getTodayShamsi()
    };
  });
  
  const [savedAssessments, setSavedAssessments] = useState<AssessmentSession[]>(() => {
    try {
      const history = localStorage.getItem('ergo_history');
      return history ? JSON.parse(history) : [];
    } catch { return []; }
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync document state and styles
  useEffect(() => {
    document.documentElement.dir = lang === 'fa' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang;
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('ergo_theme', theme);
  }, [lang, theme]);

  // Status message auto-dismiss
  useEffect(() => {
    if (statusMessage) {
      const timer = setTimeout(() => setStatusMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [statusMessage]);

  const results = useMemo(() => {
    if (Object.keys(formData).length === 0) return null;
    if (method === 'REBA') return calculateREBA(formData, lang);
    if (method === 'RULA') return calculateRULA(formData, lang);
    if (method === 'OWAS') return calculateOWAS(formData, lang);
    if (method === 'NIOSH') return calculateNIOSH(formData, lang);
    return null;
  }, [formData, method, lang]);

  const corrections = useMemo(() => {
    if (!results) return [];
    return generateCorrections(method, results, formData, lang);
  }, [results, method, formData, lang]);

  useEffect(() => {
    const initData: any = {};
    const fields = method === 'REBA' ? REBA_FIELDS : method === 'RULA' ? RULA_FIELDS : method === 'OWAS' ? OWAS_FIELDS : null;
    if (fields) {
      Object.keys(fields).forEach(key => {
        initData[key] = (fields as any)[key].min;
      });
    } else if (method === 'NIOSH') {
      initData.weight = 10;
      initData.hDist = 25;
      initData.vDist = 75;
      initData.vOrigin = 75;
      initData.asymmetry = 0;
      initData.coupling = 'good';
    }
    setFormData(initData);
  }, [method]);

  const handleValueChange = (key: string, val: any) => {
    setFormData((prev: any) => ({ ...prev, [key]: val }));
  };

  const handleMetadataChange = (key: keyof AssessmentMetadata, val: string) => {
    setMetadata(prev => ({ ...prev, [key]: val }));
    if (key === 'assessor') {
      localStorage.setItem('ergo_last_assessor', val);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        setImage(reader.result as string);
        setIsAnalyzing(true);
        setStatusMessage({ text: lang === 'fa' ? 'در حال تحلیل هوشمند تصویر...' : 'AI Analyzing image...', type: 'info' });
        
        try {
          const analysis = await analyzePostureFromImage(base64, method);
          if (analysis) {
            const params = analysis.estimatedParameters;
            setAiObservations(analysis.observations || "");
            setFormData((prev: any) => {
              const next = { ...prev };
              Object.keys(params).forEach(key => {
                if (key in next) {
                  const fields = method === 'REBA' ? REBA_FIELDS : method === 'RULA' ? RULA_FIELDS : method === 'OWAS' ? OWAS_FIELDS : null;
                  if (fields && (fields as any)[key]) {
                     next[key] = Math.max((fields as any)[key].min, Math.min((fields as any)[key].max, params[key]));
                  }
                }
              });
              return next;
            });
            setStatusMessage({ text: lang === 'fa' ? 'تحلیل با موفقیت پایان یافت' : 'AI Analysis completed successfully', type: 'success' });
          }
        } catch (err) {
          setStatusMessage({ text: lang === 'fa' ? 'خطا در ارتباط با هوش مصنوعی' : 'Error connecting to AI service', type: 'error' });
        }
        setIsAnalyzing(false);
      };
      reader.readAsDataURL(file);
    }
  };

  const saveToHistory = () => {
    try {
      const session: AssessmentSession = {
        id: Date.now().toString(),
        timestamp: Date.now(),
        method,
        metadata,
        formData,
        results,
        image
      };
      const newHistory = [session, ...savedAssessments];
      setSavedAssessments(newHistory);
      localStorage.setItem('ergo_history', JSON.stringify(newHistory));
      setStatusMessage({ text: lang === 'fa' ? 'ارزیابی در تاریخچه محلی ذخیره شد' : 'Assessment saved to local history', type: 'success' });
    } catch (e) {
      setStatusMessage({ text: lang === 'fa' ? 'خطا در ذخیره‌سازی: ظرفیت حافظه پر است' : 'Storage error: Capacity might be full', type: 'error' });
    }
  };

  const exportData = () => {
    setIsExporting(true);
    setStatusMessage({ text: lang === 'fa' ? 'در حال پردازش فایل پشتیبان...' : 'Processing backup file...', type: 'info' });
    
    // Use timeout to allow UI to update state before heavy stringification
    setTimeout(() => {
      try {
        const dataStr = JSON.stringify(savedAssessments);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', url);
        linkElement.setAttribute('download', `ergo_pro_backup_${new Date().toISOString().split('T')[0]}.json`);
        linkElement.click();
        
        // Cleanup
        setTimeout(() => URL.revokeObjectURL(url), 100);
        setStatusMessage({ text: lang === 'fa' ? 'فایل پشتیبان با موفقیت صادر شد' : 'Backup exported successfully', type: 'success' });
      } catch (err) {
        setStatusMessage({ text: lang === 'fa' ? 'خطا در تهیه فایل پشتیبان' : 'Error generating backup file', type: 'error' });
      } finally {
        setIsExporting(false);
      }
    }, 100);
  };

  const importData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsImporting(true);
    setStatusMessage({ text: lang === 'fa' ? 'در حال خواندن و بازیابی داده‌ها...' : 'Reading and restoring data...', type: 'info' });
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const imported = JSON.parse(content);
        
        if (!Array.isArray(imported)) {
          throw new Error('Invalid format: Expected an array of assessments');
        }
        
        setSavedAssessments(imported);
        localStorage.setItem('ergo_history', JSON.stringify(imported));
        setStatusMessage({ 
          text: lang === 'fa' ? `${imported.length} مورد با موفقیت بازیابی شد` : `Successfully restored ${imported.length} items`, 
          type: 'success' 
        });
      } catch (err) {
        setStatusMessage({ text: lang === 'fa' ? 'فرمت فایل پشتیبان صحیح نیست' : 'Invalid backup file format', type: 'error' });
      } finally {
        setIsImporting(false);
      }
    };
    reader.onerror = () => {
      setStatusMessage({ text: 'Error reading file', type: 'error' });
      setIsImporting(false);
    };
    reader.readAsText(file);
    // Reset input for next use
    e.target.value = '';
  };

  const t = {
    aiAnalysis: lang === 'fa' ? "تحلیل هوشمند" : "AI Analysis",
    analyzing: lang === 'fa' ? "در حال پردازش..." : "Analyzing...",
    changeImg: lang === 'fa' ? "تغییر تصویر" : "Change Image",
    uploadPrompt: lang === 'fa' ? "بارگذاری تصویر" : "Upload Image",
    uploadSub: lang === 'fa' ? "تصویر پوسچر کاری را انتخاب کنید" : "Select workplace posture image",
    aiObs: lang === 'fa' ? "مشاهدات هوشمند" : "AI Observations",
    finalScore: lang === 'fa' ? "امتیاز نهایی" : "Final Score",
    recommendations: lang === 'fa' ? "توصیه‌های اصلاحی" : "Recommendations",
    parameters: lang === 'fa' ? "پارامترهای" : "Parameters",
    printReport: lang === 'fa' ? "چاپ گزارش" : "Print Report",
    saveAss: lang === 'fa' ? "ذخیره در تاریخچه" : "Save to History",
    loadWeight: lang === 'fa' ? "وزن بار (kg)" : "Load Weight (kg)",
    hDist: lang === 'fa' ? "فاصله افقی (cm)" : "Horizontal Distance (cm)",
    vDist: lang === 'fa' ? "فاصله عمودی (cm)" : "Vertical Distance (cm)",
    asym: lang === 'fa' ? "ناقرینگی (درجه)" : "Asymmetry (deg)",
    coupling: lang === 'fa' ? "کیفیت گرفتن" : "Coupling",
    good: lang === 'fa' ? "خوب" : "Good",
    fair: lang === 'fa' ? "متوسط" : "Fair",
    poor: lang === 'fa' ? "ضعیف" : "Poor",
    footerSub: lang === 'fa' ? "سیستم مدیریت ارزیابی‌های ارگونومی" : "Ergonomic Assessment Management System",
    metadataTitle: lang === 'fa' ? "اطلاعات شناسنامه‌ای ارزیابی" : "Assessment Metadata",
    jobTitle: lang === 'fa' ? "عنوان پست کاری" : "Job Title",
    assessor: lang === 'fa' ? "نام ارزیاب" : "Assessor Name",
    evalee: lang === 'fa' ? "نام ارزیابی‌شونده" : "Evalee Name",
    date: lang === 'fa' ? "تاریخ انجام (شمسی)" : "Assessment Date",
    history: lang === 'fa' ? "تاریخچه ارزیابی‌ها" : "History",
    backup: lang === 'fa' ? "پشتیبان‌گیری" : "Backup",
    restore: lang === 'fa' ? "بازیابی داده" : "Restore",
    emptyHistory: lang === 'fa' ? "هیچ ارزیابی ذخیره شده‌ای وجود ندارد" : "No saved assessments",
    untitled: lang === 'fa' ? "بدون عنوان" : "Untitled",
    reportTitle: lang === 'fa' ? "گزارش ارزیابی ارگونومی" : "Ergonomic Assessment Report",
    loading: lang === 'fa' ? "در حال بارگذاری..." : "Loading...",
    clearHistory: lang === 'fa' ? "پاکسازی تاریخچه" : "Clear History"
  };

  return (
    <div className="min-h-screen pb-12 transition-all duration-300 bg-slate-50 dark:bg-[#0d1117] text-slate-900 dark:text-[#e6edf3]">
      
      {/* Toast Notification */}
      {statusMessage && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-2xl shadow-2xl border flex items-center gap-3 transition-all animate-in fade-in slide-in-from-bottom-4 duration-300
          ${statusMessage.type === 'success' ? 'bg-emerald-500 text-white border-emerald-400' : 
            statusMessage.type === 'error' ? 'bg-red-500 text-white border-red-400' : 
            'bg-blue-600 text-white border-blue-400'}`}>
          <span className="text-xl">
            {statusMessage.type === 'success' ? '✅' : statusMessage.type === 'error' ? '❌' : 'ℹ️'}
          </span>
          <span className="text-xs font-black uppercase tracking-tight">{statusMessage.text}</span>
        </div>
      )}

      {/* Loading Overlays for Backup/Restore */}
      {(isExporting || isImporting) && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] flex flex-col items-center justify-center gap-4">
            <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-white font-bold text-lg animate-pulse">{t.loading}</p>
        </div>
      )}

      {/* Header */}
      <header className="no-print bg-white/80 dark:bg-[#1c2434]/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-200 dark:border-white/10 px-6 py-4 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <span className="text-xl">🪑</span>
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight leading-none">ErgoPro AI</h1>
            <p className="text-[10px] uppercase tracking-widest text-slate-500 mt-1 font-black">Industrial Suite</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          <nav className="hidden lg:flex items-center gap-1 bg-slate-100 dark:bg-white/5 p-1 rounded-xl border border-slate-200 dark:border-white/10">
            {(['REBA', 'RULA', 'OWAS', 'NIOSH'] as MethodType[]).map((m) => (
              <button
                key={m}
                onClick={() => setMethod(m)}
                className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${
                  method === m 
                  ? "bg-blue-600 text-white shadow-md scale-105" 
                  : "text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-white"
                }`}
              >
                {m}
              </button>
            ))}
          </nav>

          <div className="flex items-center gap-2 border-l border-slate-200 dark:border-white/10 pl-4 ml-2">
            <button 
              onClick={() => setTheme(t => t === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 transition-colors hover:bg-slate-200 dark:hover:bg-white/10"
              title="Toggle Theme"
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
            <button 
              onClick={() => setLang(l => l === 'fa' ? 'en' : 'fa')}
              className="px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 text-[10px] font-black uppercase transition-colors hover:bg-slate-200 dark:hover:bg-white/10"
            >
              {lang === 'fa' ? 'English' : 'فارسی'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Metadata & Results */}
        <div className="lg:col-span-5 space-y-6">
          {/* Metadata Section */}
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-2xl shadow-sm p-6 no-print hover:shadow-md transition-shadow">
            <h2 className="text-sm font-bold mb-4 flex items-center gap-2 border-b dark:border-white/5 pb-2">
              <span>📋</span> {t.metadataTitle}
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-[10px] text-slate-500 uppercase block mb-1 font-black">{t.jobTitle}</label>
                <input 
                  placeholder={lang === 'fa' ? 'مثال: اپراتور جوشکاری' : 'e.g. Welding Operator'}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-500 dark:text-white transition-all font-bold" 
                  value={metadata.jobTitle}
                  onChange={e => handleMetadataChange('jobTitle', e.target.value)}
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 uppercase block mb-1 font-black">{t.assessor}</label>
                <input 
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-500 dark:text-white transition-all font-bold" 
                  value={metadata.assessor}
                  onChange={e => handleMetadataChange('assessor', e.target.value)}
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 uppercase block mb-1 font-black">{t.evalee}</label>
                <input 
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-500 dark:text-white transition-all font-bold" 
                  value={metadata.evalee}
                  onChange={e => handleMetadataChange('evalee', e.target.value)}
                />
              </div>
              <div className="col-span-2">
                <label className="text-[10px] text-slate-500 uppercase block mb-1 font-black">{t.date}</label>
                <input 
                  type="text"
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-xs outline-none focus:border-blue-500 dark:text-white transition-all font-bold" 
                  value={metadata.date}
                  onChange={e => handleMetadataChange('date', e.target.value)}
                />
                <p className="text-[9px] text-slate-400 mt-1 italic font-medium">{lang === 'fa' ? 'پیش‌فرض: امروز (قابل تغییر)' : 'Default: Today (Editable)'}</p>
              </div>
            </div>
          </section>

          {/* AI Visualization */}
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
            <div className="p-4 border-b border-slate-100 dark:border-white/5 flex items-center justify-between bg-slate-50 dark:bg-white/5">
              <h2 className="text-sm font-bold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                {t.aiAnalysis}
              </h2>
              {isAnalyzing && <div className="text-[10px] text-blue-500 animate-pulse font-black">{t.analyzing}</div>}
            </div>
            
            <div className="p-6">
              {image ? (
                <div className="relative group overflow-hidden rounded-xl border border-slate-200 dark:border-white/10">
                  <img src={image} className="w-full object-cover max-h-[400px] shadow-lg transition-transform group-hover:scale-105 duration-700" />
                  <label className="no-print absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity backdrop-blur-sm">
                    <span className="bg-white text-black px-5 py-2.5 rounded-xl text-xs font-black shadow-2xl scale-90 group-hover:scale-100 transition-transform">{t.changeImg}</span>
                    <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                  </label>
                </div>
              ) : (
                <label className="w-full border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl py-20 flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-blue-500 hover:bg-blue-500/5 transition-all group">
                  <div className="w-14 h-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-3xl group-hover:scale-110 transition-transform shadow-inner group-hover:shadow-blue-500/10 group-hover:bg-blue-500/10 group-hover:text-blue-500">📸</div>
                  <div className="text-center">
                    <p className="text-sm font-black text-slate-600 dark:text-slate-300 group-hover:text-blue-500">{t.uploadPrompt}</p>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-medium">{t.uploadSub}</p>
                  </div>
                  <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                </label>
              )}

              {aiObservations && (
                <div className="mt-4 p-4 bg-blue-500/5 dark:bg-blue-500/10 border border-blue-500/20 rounded-xl animate-in fade-in duration-500">
                  <h3 className="text-[10px] font-black text-blue-600 dark:text-blue-400 mb-1.5 flex items-center gap-2 uppercase tracking-widest">
                    <span>💡</span> {t.aiObs}
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-bold italic">{aiObservations}</p>
                </div>
              )}
            </div>
          </section>

          {/* Results Card */}
          {results && (
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-2xl p-6 shadow-sm relative overflow-hidden transition-all hover:shadow-xl">
               <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-[60px] rounded-full -mr-16 -mt-16"></div>
               
               {/* Report Header (Print only) */}
               <div className="print-only mb-10 border-b-2 border-slate-900 dark:border-white pb-6">
                  <h1 className="text-3xl font-black mb-4 text-center uppercase tracking-tighter">{t.reportTitle}</h1>
                  <div className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm border p-5 rounded-2xl bg-slate-50 dark:bg-slate-800 shadow-inner">
                    <p><strong>{t.jobTitle}:</strong> <span className="underline decoration-slate-400">{metadata.jobTitle || '---'}</span></p>
                    <p><strong>{t.evalee}:</strong> <span className="underline decoration-slate-400">{metadata.evalee || '---'}</span></p>
                    <p><strong>{t.assessor}:</strong> <span className="underline decoration-slate-400">{metadata.assessor || '---'}</span></p>
                    <p><strong>{t.date}:</strong> <span className="underline decoration-slate-400">{metadata.date || '---'}</span></p>
                  </div>
                  {image && (
                    <div className="mt-8 text-center">
                       <p className="text-[10px] font-black mb-3 uppercase text-slate-500 tracking-widest">{lang === 'fa' ? 'تصویر وضعیت ارزیابی شده' : 'CAPTURED POSTURE IMAGE'}</p>
                       <img src={image} className="max-h-[350px] mx-auto rounded-2xl border-4 border-white dark:border-slate-700 shadow-2xl" />
                    </div>
                  )}
               </div>

               <div className="text-center relative">
                  <p className="text-[10px] uppercase tracking-[0.25em] text-slate-500 font-black mb-2">{t.finalScore} {method}</p>
                  <span className="text-8xl font-black tabular-nums transition-all drop-shadow-sm" style={{ color: results.color }}>
                    {results.total !== undefined ? results.total : results.category !== undefined ? results.category : results.LI}
                  </span>
                  
                  <div className="mt-5 inline-flex items-center gap-2 px-5 py-2 rounded-full text-xs font-black border-2 shadow-sm uppercase tracking-widest" style={{ borderColor: `${results.color}66`, backgroundColor: `${results.color}11`, color: results.color }}>
                    {results.level}
                  </div>
                  <p className="mt-5 text-slate-600 dark:text-slate-200 font-black text-xl leading-snug">{results.action}</p>
               </div>

               <div className="mt-8 pt-8 border-t border-slate-100 dark:border-white/5 space-y-4">
                  <h4 className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em]">{t.recommendations}</h4>
                  {corrections.map((corr, i) => (
                    <div key={i} className="flex gap-4 p-4 bg-slate-50 dark:bg-white/2 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm hover:border-blue-500/30 transition-all">
                      <div className="text-3xl shrink-0 flex items-center justify-center">{corr.icon}</div>
                      <div>
                        <h5 className="text-[11px] font-black mb-1 text-slate-900 dark:text-white uppercase tracking-tight">{corr.title}</h5>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed font-bold">{corr.detail}</p>
                      </div>
                    </div>
                  ))}
               </div>
            </section>
          )}
        </div>

        {/* Right Column: Parameters & Persistence */}
        <div className="lg:col-span-7 space-y-8">
          {/* Method Parameters Form */}
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-2xl shadow-sm hover:shadow-lg transition-all">
            <div className="p-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-3">
                  <span className="text-2xl drop-shadow-sm">{METHOD_METADATA[method].icon}</span>
                  {t.parameters} {method}
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 font-bold italic opacity-80">
                  {lang === 'fa' ? METHOD_METADATA[method].descFa : METHOD_METADATA[method].descEn}
                </p>
              </div>
            </div>

            <div className="p-8">
              {method !== 'NIOSH' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12">
                  {Object.entries(
                    method === 'REBA' ? REBA_FIELDS : 
                    method === 'RULA' ? RULA_FIELDS : 
                    OWAS_FIELDS
                  ).map(([key, field]) => (
                    <SliderField 
                      key={key}
                      field={field}
                      fieldKey={key}
                      value={formData[key] || (field as any).min || 0}
                      onChange={handleValueChange}
                      lang={lang}
                    />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-10">
                   <div className="space-y-4">
                      <label className="text-[10px] font-black text-slate-500 block uppercase tracking-widest">{t.loadWeight}</label>
                      <input className="w-full bg-slate-50 dark:bg-slate-800 border dark:border-white/10 p-4 rounded-2xl text-sm font-black shadow-inner focus:border-blue-500 outline-none transition-all dark:text-white" type="number" value={formData.weight} onChange={e => handleValueChange('weight', parseFloat(e.target.value))} />
                   </div>
                   <div className="space-y-4">
                      <label className="text-[10px] font-black text-slate-500 block uppercase tracking-widest">{t.hDist}</label>
                      <input className="w-full bg-slate-50 dark:bg-slate-800 border dark:border-white/10 p-4 rounded-2xl text-sm font-black shadow-inner focus:border-blue-500 outline-none transition-all dark:text-white" type="number" value={formData.hDist} onChange={e => handleValueChange('hDist', parseFloat(e.target.value))} />
                   </div>
                </div>
              )}
            </div>

            {/* Actions Toolbar */}
            <div className="no-print px-8 py-6 bg-slate-50 dark:bg-white/2 border-t border-slate-200 dark:border-white/5 flex flex-wrap justify-end gap-3 items-center">
              <div className="flex gap-2 p-1.5 bg-white/60 dark:bg-black/20 rounded-2xl border border-slate-200 dark:border-white/10 shadow-inner">
                <button 
                  onClick={exportData}
                  disabled={isExporting}
                  title={t.backup}
                  className="p-3 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-all shadow-sm active:scale-90 disabled:opacity-50"
                >
                  💾
                </button>
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isImporting}
                  title={t.restore}
                  className="p-3 bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-all shadow-sm active:scale-90 disabled:opacity-50"
                >
                  📂
                </button>
              </div>
              <input ref={fileInputRef} type="file" className="hidden" accept=".json" onChange={importData} />
              
              <div className="grow"></div>

              <button 
                onClick={saveToHistory}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-black rounded-xl uppercase transition-all shadow-lg shadow-emerald-600/20 active:scale-95 flex items-center gap-2"
              >
                📥 {t.saveAss}
              </button>
              <button 
                onClick={() => window.print()}
                className="px-8 py-3 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black rounded-xl transition-all shadow-xl shadow-blue-600/30 active:scale-95 flex items-center gap-2"
              >
                🖨️ {t.printReport}
              </button>
            </div>
          </section>

          {/* History / Sessions Management */}
          <section className="no-print bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/5 rounded-2xl shadow-sm overflow-hidden hover:shadow-lg transition-all">
             <div className="p-4 bg-slate-50 dark:bg-white/5 border-b border-slate-200 dark:border-white/5 flex items-center justify-between">
                <h3 className="text-[11px] font-black flex items-center gap-2 uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400">
                  <span>📜</span> {t.history} <span className="bg-blue-500/10 text-blue-600 px-2.5 py-1 rounded-full text-[10px] font-black border border-blue-500/10">{savedAssessments.length}</span>
                </h3>
                {savedAssessments.length > 0 && (
                  <button 
                    onClick={() => {
                      if(confirm(lang === 'fa' ? 'آیا کل تاریخچه ارزیابی‌ها حذف شود؟' : 'Clear all assessment history?')){
                        setSavedAssessments([]);
                        localStorage.removeItem('ergo_history');
                        setStatusMessage({ text: lang === 'fa' ? 'تاریخچه پاکسازی شد' : 'History cleared', type: 'info' });
                      }
                    }}
                    className="text-[9px] font-black text-red-500 hover:text-red-600 uppercase tracking-widest"
                  >
                    🗑️ {t.clearHistory}
                  </button>
                )}
             </div>
             <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
               {savedAssessments.length === 0 ? (
                 <div className="p-16 text-center text-slate-400 text-xs italic font-medium">
                   {t.emptyHistory}
                 </div>
               ) : (
                 <div className="divide-y divide-slate-100 dark:divide-white/5">
                   {savedAssessments.map(item => (
                     <div key={item.id} className="p-5 hover:bg-slate-50 dark:hover:bg-white/2 transition-all flex items-center justify-between group">
                        <div className="flex items-center gap-5">
                          <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-600 flex items-center justify-center text-xs font-black shadow-sm border border-blue-500/10 transition-transform group-hover:rotate-6">
                            {item.method}
                          </div>
                          <div>
                            <p className="text-xs font-black text-slate-800 dark:text-slate-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{item.metadata.jobTitle || t.untitled}</p>
                            <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold mt-0.5">{item.metadata.evalee || '---'} • {item.metadata.date}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2.5 opacity-0 group-hover:opacity-100 transition-all translate-x-4 group-hover:translate-x-0">
                           <button 
                            onClick={() => {
                              setMethod(item.method);
                              setMetadata(item.metadata);
                              setFormData(item.formData);
                              setImage(item.image);
                              setStatusMessage({ text: lang === 'fa' ? 'نشست فراخوانی شد' : 'Session loaded', type: 'info' });
                              window.scrollTo({ top: 0, behavior: 'smooth' });
                            }}
                            className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                            title="Restore this session"
                           >👁️</button>
                           <button 
                            onClick={() => {
                              if(confirm(lang === 'fa' ? 'این ارزیابی حذف شود؟' : 'Delete this assessment?')){
                                const updated = savedAssessments.filter(a => a.id !== item.id);
                                setSavedAssessments(updated);
                                localStorage.setItem('ergo_history', JSON.stringify(updated));
                                setStatusMessage({ text: lang === 'fa' ? 'مورد حذف شد' : 'Item deleted', type: 'info' });
                              }
                            }}
                            className="p-2.5 rounded-xl bg-red-500/10 text-red-600 hover:bg-red-600 hover:text-white transition-all shadow-sm"
                            title="Delete"
                           >🗑️</button>
                        </div>
                     </div>
                   ))}
                 </div>
               )}
             </div>
          </section>
        </div>
      </main>

      <footer className="no-print mt-24 py-12 text-center border-t border-slate-200 dark:border-white/10 opacity-70">
        <p className="text-[10px] text-slate-500 dark:text-slate-400 uppercase tracking-[0.4em] font-black">{t.footerSub}</p>
        <div className="flex justify-center gap-10 mt-8">
          <div className="flex flex-col items-center gap-2 group cursor-help">
             <span className="text-2xl drop-shadow-md group-hover:scale-110 transition-transform">⚖️</span>
             <span className="text-[9px] text-slate-400 font-black uppercase tracking-tighter group-hover:text-blue-500 transition-colors">ISO 11228</span>
          </div>
          <div className="flex flex-col items-center gap-2 group cursor-help">
             <span className="text-2xl drop-shadow-md group-hover:scale-110 transition-transform">🔒</span>
             <span className="text-[9px] text-slate-400 font-black uppercase tracking-tighter group-hover:text-emerald-500 transition-colors">Local First</span>
          </div>
          <div className="flex flex-col items-center gap-2 group cursor-help">
             <span className="text-2xl drop-shadow-md group-hover:scale-110 transition-transform">🧠</span>
             <span className="text-[9px] text-slate-400 font-black uppercase tracking-tighter group-hover:text-amber-500 transition-colors">AI Core v3</span>
          </div>
        </div>
        <p className="text-[9px] text-slate-400 mt-10 uppercase tracking-[0.2em] font-bold">ErgoPro Enterprise Suite • Build 2025.02.R6 LTS</p>
      </footer>
    </div>
  );
}
