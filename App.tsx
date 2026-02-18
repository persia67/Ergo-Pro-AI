
import React, { useState, useEffect, useMemo } from 'react';
import { 
  calculateREBA, 
  calculateRULA, 
  calculateOWAS, 
  calculateNIOSH, 
  generateCorrections, 
  METHOD_METADATA, 
  REBA_FIELDS, 
  RULA_FIELDS, 
  OWAS_FIELDS 
} from './constants';
import { MethodType, Correction } from './types';
import { analyzePostureFromImage } from './geminiService';

// --- Sub-components ---

const SliderField: React.FC<{ 
  field: any; 
  fieldKey: string; 
  value: number; 
  onChange: (key: string, val: number) => void 
}> = ({ field, fieldKey, value, onChange }) => {
  return (
    <div className="mb-8">
      <div className="flex justify-between items-center mb-2">
        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{field.label}</label>
        <span className="bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded text-sm font-bold border border-blue-500/30">{value}</span>
      </div>
      <input 
        type="range" 
        min={field.min} 
        max={field.max} 
        step={1} 
        value={value} 
        onChange={(e) => onChange(fieldKey, parseInt(e.target.value))}
        className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
      />
      <div className="flex justify-between mt-2">
        {field.descriptions.map((desc: string, i: number) => (
          <div key={i} className="text-[9px] text-slate-500 leading-tight text-center px-1" style={{ width: `${100/field.descriptions.length}%` }}>
            <span className={value === (field.min + i) ? "text-blue-400 font-bold" : ""}>
              {desc}
            </span>
          </div>
        ))}
      </div>
      <p className="text-[10px] text-slate-600 mt-2 italic">{field.help}</p>
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

  // Derived state for results - Using useMemo prevents stale effect dependencies causing crashes
  const results = useMemo(() => {
    if (Object.keys(formData).length === 0) return null;
    
    // Check if formData contains method-specific keys to avoid calculating with stale data
    if (method === 'REBA' && !('neck' in formData)) return null;
    if (method === 'RULA' && !('upperArm' in formData)) return null;
    if (method === 'OWAS' && !('back' in formData)) return null;
    if (method === 'NIOSH' && !('weight' in formData)) return null;

    if (method === 'REBA') return calculateREBA(formData);
    if (method === 'RULA') return calculateRULA(formData);
    if (method === 'OWAS') return calculateOWAS(formData);
    if (method === 'NIOSH') return calculateNIOSH(formData);
    return null;
  }, [formData, method]);

  const corrections = useMemo(() => {
    if (!results) return [];
    return generateCorrections(method, results, formData);
  }, [results, method, formData]);

  // Initialize form data based on method
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
      initData.frequency = 1;
      initData.duration = 1;
      initData.coupling = 'good';
    }
    setFormData(initData);
  }, [method]);

  // Handle value change
  const handleValueChange = (key: string, val: any) => {
    setFormData((prev: any) => ({ ...prev, [key]: val }));
  };

  // Handle Image Upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        setImage(reader.result as string);
        
        // Start AI Analysis
        setIsAnalyzing(true);
        const analysis = await analyzePostureFromImage(base64, method);
        if (analysis) {
          const params = analysis.estimatedParameters;
          setAiObservations(analysis.observations || "");
          
          // Patch form data with estimated values
          setFormData((prev: any) => {
            const next = { ...prev };
            Object.keys(params).forEach(key => {
              if (key in next) {
                // Ensure value is within valid range for the current method
                const fields = method === 'REBA' ? REBA_FIELDS : method === 'RULA' ? RULA_FIELDS : method === 'OWAS' ? OWAS_FIELDS : null;
                if (fields && (fields as any)[key]) {
                   next[key] = Math.max((fields as any)[key].min, Math.min((fields as any)[key].max, params[key]));
                } else if (method === 'NIOSH') {
                   // Special handling for NIOSH if needed
                   next[key] = params[key];
                }
              }
            });
            return next;
          });
        }
        setIsAnalyzing(false);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="min-h-screen pb-12">
      {/* Header */}
      <header className="bg-[#1c2434]/80 backdrop-blur-md sticky top-0 z-50 border-b border-white/10 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/20">
            <span className="text-xl">🪑</span>
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-white leading-none">ErgoPro AI</h1>
            <p className="text-[10px] uppercase tracking-widest text-slate-400 mt-1">Industrial Assessment Suite</p>
          </div>
        </div>
        <nav className="flex items-center gap-2">
          {(['REBA', 'RULA', 'OWAS', 'NIOSH'] as MethodType[]).map((m) => (
            <button
              key={m}
              onClick={() => setMethod(m)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                method === m 
                ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" 
                : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              {m}
            </button>
          ))}
        </nav>
      </header>

      <main className="max-w-6xl mx-auto px-6 mt-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: Image & Analysis Result */}
        <div className="lg:col-span-5 space-y-6">
          <section className="bg-slate-900 border border-white/5 rounded-2xl overflow-hidden shadow-xl">
            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/5">
              <h2 className="text-sm font-bold flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                تحلیل تصویری (AI)
              </h2>
              {isAnalyzing && <div className="text-[10px] text-blue-400 animate-pulse">در حال تحلیل...</div>}
            </div>
            
            <div className="p-6">
              {image ? (
                <div className="relative group">
                  <img src={image} className="w-full rounded-xl object-cover max-h-[400px] border border-white/10" />
                  <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity rounded-xl backdrop-blur-sm">
                    <span className="bg-white text-black px-4 py-2 rounded-lg text-xs font-bold">تغییر تصویر</span>
                    <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                  </label>
                </div>
              ) : (
                <label className="w-full border-2 border-dashed border-slate-700 rounded-2xl py-20 flex flex-col items-center justify-center gap-4 cursor-pointer hover:border-blue-500/50 hover:bg-blue-500/5 transition-all group">
                  <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">📸</div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-slate-300">بارگذاری تصویر برای تحلیل خودکار</p>
                    <p className="text-[10px] text-slate-500 mt-1">تصویر پوسچر کاری را انتخاب کنید</p>
                  </div>
                  <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                </label>
              )}

              {aiObservations && (
                <div className="mt-6 p-4 bg-blue-500/5 border border-blue-500/20 rounded-xl">
                  <h3 className="text-xs font-bold text-blue-400 mb-2 flex items-center gap-2">
                    <span>💡</span> مشاهدات هوش مصنوعی
                  </h3>
                  <p className="text-xs text-slate-400 leading-relaxed">{aiObservations}</p>
                </div>
              )}
            </div>
          </section>

          {/* Results Card */}
          {results && (
            <section className="bg-slate-900 border border-white/5 rounded-2xl p-6 shadow-xl relative overflow-hidden">
               {/* Background Glow */}
               <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 blur-[60px] rounded-full -mr-16 -mt-16"></div>
               
               <div className="text-center">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-bold mb-2">امتیاز نهایی {method}</p>
                  <div className="inline-block relative">
                    <span className="text-7xl font-black tabular-nums" style={{ color: results.color }}>
                      {results.total !== undefined ? results.total : results.category !== undefined ? results.category : results.LI}
                    </span>
                  </div>
                  
                  <div className="mt-4 inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold border" style={{ borderColor: `${results.color}44`, backgroundColor: `${results.color}11`, color: results.color }}>
                    <span className="w-2 h-2 rounded-full animate-ping" style={{ backgroundColor: results.color }}></span>
                    {results.level}
                  </div>

                  <p className="mt-4 text-slate-300 font-medium">{results.action}</p>
               </div>

               <div className="mt-8 pt-8 border-t border-white/5 space-y-4">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">اقدامات اصلاحی پیشنهادی</h4>
                  {corrections.map((corr, i) => (
                    <div key={i} className="flex gap-4 p-3 bg-white/2 rounded-xl border border-white/5 hover:border-white/10 transition-colors">
                      <div className="text-2xl shrink-0">{corr.icon}</div>
                      <div>
                        <h5 className="text-xs font-bold text-white mb-1">{corr.title}</h5>
                        <p className="text-[11px] text-slate-500 leading-normal">{corr.detail}</p>
                      </div>
                    </div>
                  ))}
               </div>
            </section>
          )}
        </div>

        {/* Right Column: Parameters Form */}
        <div className="lg:col-span-7">
          <section className="bg-slate-900 border border-white/5 rounded-2xl shadow-xl">
            <div className="p-6 border-b border-white/5 flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold flex items-center gap-3">
                  <span>{METHOD_METADATA[method].icon}</span>
                  پارامترهای {METHOD_METADATA[method].name}
                </h2>
                <p className="text-[11px] text-slate-500 mt-1">{METHOD_METADATA[method].desc}</p>
              </div>
              <div className="px-3 py-1 bg-white/5 rounded-lg border border-white/10 text-[10px] font-mono text-slate-400">
                VER: 3.2.0
              </div>
            </div>

            <div className="p-8">
              {method !== 'NIOSH' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-2">
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
                    />
                  ))}
                </div>
              ) : (
                /* NIOSH Specific Form */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide">وزن بار (کیلوگرم)</label>
                      <input 
                        type="number" 
                        value={formData.weight || ''} 
                        onChange={e => handleValueChange('weight', parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide">فاصله افقی (سانتی‌متر)</label>
                      <input 
                        type="number" 
                        value={formData.hDist || ''} 
                        onChange={e => handleValueChange('hDist', parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide">فاصله عمودی (سانتی‌متر)</label>
                      <input 
                        type="number" 
                        value={formData.vDist || ''} 
                        onChange={e => handleValueChange('vDist', parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 outline-none transition-colors"
                      />
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide">ناقرینگی (درجه)</label>
                      <input 
                        type="number" 
                        value={formData.asymmetry || ''} 
                        onChange={e => handleValueChange('asymmetry', parseFloat(e.target.value) || 0)}
                        className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 outline-none transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-400 mb-2 uppercase tracking-wide">کیفیت گرفتن (Coupling)</label>
                      <select 
                        value={formData.coupling || 'good'} 
                        onChange={e => handleValueChange('coupling', e.target.value)}
                        className="w-full bg-slate-800 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-blue-500 outline-none transition-colors appearance-none"
                      >
                        <option value="good">خوب</option>
                        <option value="fair">متوسط</option>
                        <option value="poor">ضعیف</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {results && method === 'NIOSH' && (
                <div className="mt-12 p-6 bg-slate-800/50 border border-white/5 rounded-2xl grid grid-cols-2 md:grid-cols-4 gap-6">
                   <div className="text-center">
                     <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">RWL</p>
                     <p className="text-xl font-bold text-blue-400">{results.RWL} kg</p>
                   </div>
                   <div className="text-center">
                     <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">Lifting Index</p>
                     <p className="text-xl font-bold text-orange-400">{results.LI}</p>
                   </div>
                   <div className="text-center">
                     <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">HM</p>
                     <p className="text-sm font-bold text-slate-300">{results.HM}</p>
                   </div>
                   <div className="text-center">
                     <p className="text-[10px] text-slate-500 uppercase font-bold mb-1">VM</p>
                     <p className="text-sm font-bold text-slate-300">{results.VM}</p>
                   </div>
                </div>
              )}
            </div>

            <div className="px-8 py-6 bg-white/2 border-t border-white/5 flex justify-end gap-4">
              <button 
                onClick={() => window.print()}
                className="px-6 py-2.5 bg-white/5 hover:bg-white/10 text-white text-xs font-bold rounded-xl transition-all border border-white/10"
              >
                چاپ گزارش
              </button>
              <button 
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-blue-600/20"
              >
                ذخیره ارزیابی
              </button>
            </div>
          </section>
        </div>
      </main>

      <footer className="mt-12 py-8 text-center border-t border-white/5">
        <p className="text-[10px] text-slate-500 uppercase tracking-widest">Designed for Professional Ergonomic Auditing</p>
        <div className="flex justify-center gap-6 mt-4">
          <span className="text-[10px] text-slate-600">ISO 11228 Compliant</span>
          <span className="text-[10px] text-slate-600">AI Posture Detection Engine 2.0</span>
          <span className="text-[10px] text-slate-600">Safe System Certification</span>
        </div>
      </footer>
    </div>
  );
}
