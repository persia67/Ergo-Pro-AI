
import { RebaData, RulaData, OwasData, NioshData } from './types';

// REBA Tables
const REBA_TABLE_A = [
  [[1,2,3,4],[2,3,4,5],[2,4,5,6],[3,5,6,7],[4,6,7,8]],
  [[1,2,3,4],[3,4,5,6],[4,5,6,7],[5,6,7,8],[6,7,8,9]],
  [[3,3,5,6],[4,5,6,7],[5,6,7,8],[6,7,8,9],[7,8,9,9]]
];

const REBA_TABLE_B = [
  [[1,2],[1,2],[3,3]],
  [[1,2],[2,3],[3,4]],
  [[3,3],[3,4],[5,5]],
  [[4,4],[4,5],[5,5]],
  [[6,6],[6,7],[7,7]],
  [[7,7],[7,8],[8,8]]
];

const REBA_TABLE_C = [
  [1,1,1,2,3,3,4,5,6,7,7,7],
  [1,2,2,3,4,4,5,6,6,7,7,8],
  [2,3,3,3,4,5,6,7,7,8,8,8],
  [3,4,4,4,5,6,7,8,8,9,9,9],
  [4,4,4,5,6,7,8,8,9,9,10,10],
  [6,6,6,7,8,8,9,9,10,10,10,10],
  [7,7,7,8,9,9,9,10,10,11,11,11],
  [8,8,8,9,10,10,10,10,10,11,11,11],
  [9,9,9,10,10,10,11,11,11,12,12,12],
  [10,10,10,11,11,11,11,12,12,12,12,12],
  [11,11,11,11,12,12,12,12,12,12,12,12],
  [12,12,12,12,12,12,12,12,12,12,12,12]
];

export function calculateREBA(data: Partial<RebaData>) {
  const { neck = 1, trunk = 1, legs = 1, upperArm = 1, lowerArm = 1, wrist = 1, load = 0, coupling = 0, activity = 0 } = data;
  
  // Safe indexing
  const neckIdx = Math.max(0, Math.min(Math.floor(neck) - 1, 2));
  const trunkIdx = Math.max(0, Math.min(Math.floor(trunk) - 1, 4));
  const legsIdx = Math.max(0, Math.min(Math.floor(legs) - 1, 3));
  
  const tableA_layer = REBA_TABLE_A[neckIdx];
  if (!tableA_layer) return null;
  const tableA_row = tableA_layer[trunkIdx];
  if (!tableA_row) return null;
  const scoreA_raw = tableA_row[legsIdx];
  
  const scoreA = Math.min(scoreA_raw + load, 12);
  
  const upperArmIdx = Math.max(0, Math.min(Math.floor(upperArm) - 1, 5));
  const lowerArmIdx = Math.max(0, Math.min(Math.floor(lowerArm) - 1, 2));
  const wristIdx = Math.max(0, Math.min(Math.floor(wrist) - 1, 2));

  const tableB_layer = REBA_TABLE_B[upperArmIdx];
  if (!tableB_layer) return null;
  const tableB_row = tableB_layer[lowerArmIdx];
  if (!tableB_row) return null;
  const scoreB_raw = tableB_row[wristIdx] || 0;
  
  const scoreB = Math.min(scoreB_raw + coupling, 12);
  
  const scoreC_row = REBA_TABLE_C[Math.min(scoreA-1, 11)];
  if (!scoreC_row) return null;
  const scoreC = scoreC_row[Math.min(scoreB-1, 11)];
  
  const total = Math.min(scoreC + activity, 15);
  
  let level, action, color;
  if (total === 1) { level = "بی‌خطر"; action = "اقدام لازم نیست"; color = "#16a34a"; }
  else if (total <= 3) { level = "پایین"; action = "تغییر ممکن است لازم باشد"; color = "#84cc16"; }
  else if (total <= 7) { level = "متوسط"; action = "تغییر لازم است"; color = "#f59e0b"; }
  else if (total <= 10) { level = "بالا"; action = "تغییر هر چه زودتر"; color = "#f97316"; }
  else { level = "بسیار بالا"; action = "تغییر فوری ضروری"; color = "#dc2626"; }
  
  return { total, scoreA, scoreB, scoreC, level, action, color };
}

const RULA_TABLE_C = [
  [1,2,3,3],[2,2,3,4],[3,3,3,4],[3,3,4,4],[4,4,4,5],[4,4,4,5],[5,5,5,6],[5,5,5,6],
  [6,6,6,7],[6,6,7,7],[7,7,7,7],[7,7,7,8]
];

const RULA_TABLE_D = [
  [1,2,3,3],[2,2,3,4],[3,3,3,4],[3,3,4,4],[4,4,4,5],[4,4,4,5],[5,5,5,6],[5,5,5,6],
  [6,6,6,7],[6,6,7,7],[7,7,7,7],[7,7,7,8]
];

export function calculateRULA(data: Partial<RulaData>) {
  const { upperArm = 1, lowerArm = 1, wrist = 1, wristTwist = 1, neck = 1, trunk = 1, legs = 1, muscle = 0, force = 0 } = data;
  
  const groupAIdx = Math.min(Math.max(0, Math.floor(upperArm) + Math.floor(lowerArm) - 2), 11);
  const wristIdx = Math.min(Math.max(0, Math.floor(wrist) - 1), 3);
  
  const tableC_row = RULA_TABLE_C[groupAIdx];
  if (!tableC_row) return null;
  const groupA_raw = tableC_row[wristIdx];
  const groupA = Math.min(groupA_raw + wristTwist - 1, 8);
  const scoreC = Math.min(groupA + muscle + force, 8);
  
  const groupBIdx = Math.min(Math.max(0, Math.floor(neck) + Math.floor(trunk) - 2), 11);
  const legsIdx = Math.min(Math.max(0, Math.floor(legs) - 1), 3);
  
  const tableD_row = RULA_TABLE_D[groupBIdx];
  if (!tableD_row) return null;
  const groupB = Math.min(tableD_row[legsIdx], 8);
  const scoreD = Math.min(groupB + muscle + force, 8);
  
  const total = Math.max(scoreC, scoreD);

  let level, action, color;
  if (total <= 2) { level = "قابل قبول"; action = "وضعیت قابل قبول"; color = "#16a34a"; }
  else if (total <= 4) { level = "بررسی لازم است"; action = "بررسی و بهبود"; color = "#f59e0b"; }
  else if (total <= 6) { level = "بررسی سریع"; action = "اصلاح هرچه زودتر"; color = "#f97316"; }
  else { level = "فوری"; action = "اصلاح فوری"; color = "#dc2626"; }
  
  return { total, scoreC, scoreD, level, action, color };
}

export function calculateOWAS(data: Partial<OwasData>) {
  const { back = 1, arms = 1, legs = 1, load = 1 } = data;
  const code = `${back}${arms}${legs}${load}`;
  let category: 1 | 2 | 3 | 4;
  const b = back, a = arms, l = legs;
  
  if (b === 1 && a <= 2 && [1,2,3].includes(l)) category = 1;
  else if (b === 1 && a <= 3 && [4,5,6].includes(l)) category = 2;
  else if (b === 2 && a <= 2 && l <= 3) category = 2;
  else if (b === 3 || b === 4 || a === 3) category = 3;
  else category = 4;

  const cats: Record<number, {action: string, color: string, level: string}> = {
    1: { action: "بدون نیاز به اقدام", color: "#16a34a", level: "سطح ۱ - کم‌خطر" },
    2: { action: "اقدام در آینده نزدیک", color: "#f59e0b", level: "سطح ۲ - متوسط" },
    3: { action: "اقدام در اسرع وقت", color: "#f97316", level: "سطح ۳ - بالا" },
    4: { action: "اقدام فوری", color: "#dc2626", level: "سطح ۴ - بحرانی" }
  };
  
  return { category, code, ...cats[category] };
}

export function calculateNIOSH(data: Partial<NioshData>) {
  const { weight = 0, hDist = 25, vDist = 0, vOrigin = 75, asymmetry = 0, frequency = 1, duration = 1, coupling = 'good' } = data;
  const LC = 23; 
  const HM = Math.min(25 / Math.max(hDist, 25), 1);
  const VM = 1 - 0.003 * Math.abs(vOrigin - 75);
  const DM = 0.82 + 4.5 / Math.max(vDist, 25);
  const AM = 1 - 0.0032 * asymmetry;
  const FM = 0.78; 
  const couplingVals = { good: 1.0, fair: 0.95, poor: 0.9 };
  const CM = couplingVals[coupling as keyof typeof couplingVals] || 0.9;
  
  const RWL = parseFloat((LC * HM * VM * DM * AM * FM * CM).toFixed(2));
  const LI = isNaN(weight / RWL) ? 0 : parseFloat((weight / RWL).toFixed(2));
  
  let level, action, color;
  if (LI <= 1) { level = "ایمن"; action = "بار بی‌خطر است"; color = "#16a34a"; }
  else if (LI <= 2) { level = "ریسک متوسط"; action = "کاهش وزن یا بهبود شرایط"; color = "#f59e0b"; }
  else { level = "ریسک بالا"; action = "طراحی مجدد وظیفه ضروری"; color = "#dc2626"; }
  
  return { RWL, LI, level, action, color, FM, HM: parseFloat(HM.toFixed(2)), VM: parseFloat(VM.toFixed(2)), DM: parseFloat(DM.toFixed(2)), AM: parseFloat(AM.toFixed(2)), CM };
}

export function generateCorrections(method: string, results: any, formData: any) {
  if (!results) return [];
  const corrections: { title: string; detail: string; icon: string }[] = [];
  if (method === "REBA") {
    const { neck, trunk, upperArm, legs } = formData;
    if (neck >= 2) corrections.push({ title: "ارتفاع مانیتور", detail: "ارتفاع مانیتور را به گونه‌ای تنظیم کنید که خط دید به وسط صفحه با زاویه ۱۵-۲۰ درجه به پایین باشد. ارتفاع توصیه‌شده: سطح چشم ± ۵ سانتی‌متر.", icon: "🖥️" });
    if (trunk >= 3) corrections.push({ title: "پشتی صندلی", detail: "صندلی با پشتی قابل تنظیم با زاویه ۱۰۰-۱۱۰ درجه نسبت به نشیمن. اگر صندلی می‌سازید: ارتفاع پشتی ۴۵-۵۰ سانتی‌متر، پهنا ۴۵ سانتی‌متر.", icon: "🪑" });
    if (upperArm >= 3) corrections.push({ title: "ارتفاع میز", detail: "ارتفاع سطح کار باید برابر ارتفاع آرنج (در حالت نشسته) باشد. اندازه‌گیری کنید: ارتفاع آرنج از زمین منهای ۲-۳ سانتی‌متر.", icon: "📐" });
    if (legs >= 3) corrections.push({ title: "تکیه‌گاه پا", detail: "زیرپایی با ارتفاع قابل تنظیم ۰-۱۵ سانتی‌متر و زاویه ۵-۱۵ درجه توصیه می‌شود. ابعاد: حداقل ۴۵×۳۵ سانتی‌متر.", icon: "🦶" });
    if (results.total > 7) corrections.push({ title: "برنامه استراحت", detail: "هر ۳۰ دقیقه ۵ دقیقه استراحت اکتیو با کشش‌های گردن، شانه و پشت.", icon: "⏱️" });
    corrections.push({ title: "مشخصات صندلی اصلاحی", detail: `صندلی با: ارتفاع نشیمن قابل تنظیم ۳۸-۵۲ سانتی‌متر، عمق نشیمن ۴۰-۴۵ سانتی‌متر، پشتی ارگونومیک کمری، دسته‌های قابل تنظیم.`, icon: "✏️" });
  } else if (method === "RULA") {
    corrections.push({ title: "آرمچر (دسته صندلی)", detail: "دسته صندلی باید در ارتفاع آرنج قرار گیرد. ارتفاع توصیه‌شده: ۲۰-۲۵ سانتی‌متر از نشیمن. تنظیم عرض: عرض شانه.", icon: "💪" });
    corrections.push({ title: "موقعیت کیبورد", detail: "کیبورد در ارتفاع آرنج، فاصله از بدن ۱۰-۱۵ سانتی‌متر. زاویه کیبورد: ۰-۱۵ درجه منفی (شیب به عقب).", icon: "⌨️" });
    if (formData.neck > 2) corrections.push({ title: "نگهدارنده اسناد", detail: "از داکیومنت هولدر کنار مانیتور استفاده کنید تا خم شدن گردن حذف شود.", icon: "📄" });
    corrections.push({ title: "موس ارگونومیک", detail: "موس ورتیکال یا موس با کاور مچ برای کاهش انحراف مچ. فاصله موس از بدن: در کنار کیبورد در همان سطح.", icon: "🖱️" });
  } else if (method === "OWAS") {
    if (formData.back >= 3) corrections.push({ title: "طراحی ایستگاه کاری ایستاده", detail: "ارتفاع سطح کار برای کار ایستاده: ارتفاع آرنج ± ۵ سانتی‌متر. کف ضد‌خستگی یا کفپوش لاستیکی ضخامت ۱۵-۲۰ میلی‌متر.", icon: "🏗️" });
    if (formData.arms >= 2) corrections.push({ title: "جانمایی ابزار", detail: "ابزار پرکاربرد در محدوده ۳۰ سانتی‌متری از بدن. ابزار گهگاه در محدوده ۳۰-۶۰ سانتی‌متر.", icon: "🔧" });
    corrections.push({ title: "صفحه شیب‌دار", detail: "برای کارهای دقیق: میز با زاویه ۱۵-۴۵ درجه برای کاهش خمش پشت.", icon: "📐" });
  } else if (method === "NIOSH") {
    corrections.push({ title: "کاهش وزن بار", detail: `وزن توصیه‌شده: ${results.RWL} کیلوگرم. اگر بار سنگین‌تر است، آن را به دو بخش تقسیم کنید.`, icon: "⚖️" });
    corrections.push({ title: "بهبود فاصله افقی", detail: "بار را نزدیک‌تر به بدن نگه دارید. فاصله ایده‌آل: ۲۵ سانتی‌متر از بدن. از ابزار کمکی یا چرخ استفاده کنید.", icon: "📏" });
    corrections.push({ title: "ارتفاع بلند کردن", detail: "نقطه شروع بلند کردن باید در ارتفاع مفصل ران (۷۵ سانتی‌متر) باشد. سطح کار را به ارتفاع مناسب بیاورید.", icon: "⬆️" });
    corrections.push({ title: "کاهش چرخش", detail: "از چرخش تنه هنگام بلند کردن خودداری کنید. محل قرارگیری بار و مقصد را در امتداد هم قرار دهید.", icon: "🔄" });
  }
  return corrections;
}

export const METHOD_METADATA = {
  REBA: { name: "REBA", full: "Rapid Entire Body Assessment", icon: "🧍", desc: "ارزیابی کل بدن - مناسب برای کارهای متنوع", color: "#1f6feb" },
  RULA: { name: "RULA", full: "Rapid Upper Limb Assessment", icon: "💪", desc: "ارزیابی اندام فوقانی - مناسب برای کارهای دستی", color: "#388bfd" },
  OWAS: { name: "OWAS", full: "Ovako Working Posture Analysis", icon: "🏗️", desc: "ارزیابی پوسچر کاری - مناسب برای کارهای صنعتی", color: "#3fb950" },
  NIOSH: { name: "NIOSH", full: "NIOSH Lifting Equation", icon: "📦", desc: "معادله بلند کردن NIOSH - مناسب برای جابجایی بار", color: "#e3b341" },
};

export const REBA_FIELDS = {
  neck: { label: "گردن (Neck)", min: 1, max: 3, descriptions: ["۱ – کمتر از ۲۰°", "۲ – بیش از ۲۰° یا انحراف", "۳ – خم شدن به عقب"], help: "زاویه خم شدن گردن رو به جلو را ارزیابی کنید" },
  trunk: { label: "تنه (Trunk)", min: 1, max: 5, descriptions: ["۱ – صاف", "۲ – ۰-۲۰°", "۳ – ۲۰-۶۰°", "۴ – بیش از ۶۰°", "۵ – چرخش یا انحراف"], help: "زاویه خم شدن تنه را ارزیابی کنید" },
  legs: { label: "پاها (Legs)", min: 1, max: 4, descriptions: ["۱ – نشسته", "۲ – ایستاده دو پا", "۳ – وزن روی یک پا", "۴ – زانو خم > ۶۰°"], help: "وضعیت پاها و توزیع وزن" },
  upperArm: { label: "بازو (Upper Arm)", min: 1, max: 6, descriptions: ["۱ – ۲۰° رو به جلو/عقب", "۲ – ۲۰-۴۵°", "۳ – ۴۵-۹۰°", "۴ – بیش از ۹۰°", "۵ – شانه بالا", "۶ – بازو به بالای سر"], help: "زاویه بازو نسبت به محور بدن" },
  lowerArm: { label: "ساعد (Lower Arm)", min: 1, max: 3, descriptions: ["۱ – ۶۰-۱۰۰°", "۲ – کمتر از ۶۰°", "۳ – بیش از ۱۰۰°"], help: "زاویه آرنج" },
  wrist: { label: "مچ (Wrist)", min: 1, max: 3, descriptions: ["۱ – صاف", "۲ – خم ۰-۱۵°", "۳ – خم > ۱۵°"], help: "انحراف مچ دست" },
  load: { label: "بار / نیرو", min: 0, max: 3, descriptions: ["۰ – کمتر از ۵ کیلوگرم", "۱ – ۵-۱۰ کیلوگرم", "۲ – بیش از ۱۰ کیلوگرم", "۳ – شوک یا نیروی ناگهانی"], help: "وزن بار یا نیروی اعمالی" },
  coupling: { label: "نحوه گرفتن (Coupling)", min: 0, max: 3, descriptions: ["۰ – خوب", "۱ – متوسط", "۲ – بد", "۳ – ناپذیرفتنی"], help: "کیفیت گرفتن ابزار یا بار" },
  activity: { label: "فعالیت (Activity Score)", min: 0, max: 3, descriptions: ["۰ – پوسچر ثابت", "۱ – تکراری", "۲ – تغییر سریع", "۳ – ناپایدار"], help: "ماهیت فعالیت کاری" },
};

export const RULA_FIELDS = {
  upperArm: { label: "بازو (Upper Arm)", min: 1, max: 6, descriptions: ["۱ – ۲۰° رو به جلو/عقب", "۲ – ۲۰-۴۵°", "۳ – ۴۵-۹۰°", "۴ – بیش از ۹۰°", "۵ – شانه بالا", "۶ – تکیه‌گاه"], help: "زاویه بازو" },
  lowerArm: { label: "ساعد (Lower Arm)", min: 1, max: 3, descriptions: ["۱ – ۶۰-۱۰۰°", "۲ – کمتر از ۶۰°", "۳ – بیش از ۱۰۰°"], help: "زاویه آرنج" },
  wrist: { label: "مچ (Wrist)", min: 1, max: 4, descriptions: ["۱ – صاف", "۲ – انحراف کمی", "۳ – خم ۱۵°+", "۴ – خم + انحراف"], help: "وضعیت مچ" },
  wristTwist: { label: "چرخش مچ", min: 1, max: 2, descriptions: ["۱ – در محدوده", "۲ – خارج از محدوده"], help: "چرخش مچ دست" },
  neck: { label: "گردن (Neck)", min: 1, max: 6, descriptions: ["۱ – ۰-۱۰°", "۲ – ۱۰-۲۰°", "۳ – بیش از ۲۰°", "۴ – خم به عقب", "۵ – انحراف", "۶ – چرخش"], help: "وضعیت گردن" },
  trunk: { label: "تنه (Trunk)", min: 1, max: 6, descriptions: ["۱ – صاف", "۲ – ۰-۲۰°", "۳ – ۲۰-۶۰°", "۴ – بیش از ۶۰°", "۵ – انحراف", "۶ – چرخش"], help: "وضعیت تنه" },
  legs: { label: "پاها (Legs)", min: 1, max: 2, descriptions: ["۱ – دو پا روی زمین", "۲ – یک پا یا ناپایدار"], help: "وضعیت پاها" },
  muscle: { label: "استفاده از عضله", min: 0, max: 1, descriptions: ["۰ – حرکات متناوب", "۱ – ثابت بیش از ۱ دقیقه"], help: "تکرار و ایستایی" },
  force: { label: "نیرو / بار", min: 0, max: 3, descriptions: ["۰ – کمتر از ۲ کیلوگرم", "۱ – ۲-۱۰ کیلوگرم", "۲ – بیش از ۱۰ کیلوگرم", "۳ – شوک ناگهانی"], help: "نیروی اعمالی" },
};

export const OWAS_FIELDS = {
  back: { label: "پشت (Back)", min: 1, max: 4, descriptions: ["۱ – صاف", "۲ – خم رو به جلو", "۳ – چرخش یا انحراف", "۴ – خم + چرخش"], help: "وضعیت کمر و پشت" },
  arms: { label: "بازوها (Arms)", min: 1, max: 3, descriptions: ["۱ – هر دو زیر شانه", "۲ – یکی بالای شانه", "۳ – هر دو بالای شانه"], help: "موقعیت بازوها نسبت به شانه" },
  legs: { label: "پاها (Legs)", min: 1, max: 7, descriptions: ["۱ – نشسته", "۲ – ایستاده دو پا صاف", "۳ – ایستاده یک پا", "۴ – ایستاده دو پا خم", "۵ – ایستاده یک پا خم", "۶ – زانو زدن", "۷ – راه رفتن"], help: "وضعیت پاها" },
  load: { label: "بار (Load)", min: 1, max: 3, descriptions: ["۱ – کمتر از ۱۰ کیلوگرم", "۲ – ۱۰-۲۰ کیلوگرم", "۳ – بیش از ۲۰ کیلوگرم"], help: "وزن بار" },
};
