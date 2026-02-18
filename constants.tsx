
import { RebaData, RulaData, OwasData, NioshData, Language } from './types';

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

export function calculateREBA(data: Partial<RebaData>, lang: Language) {
  const { neck = 1, trunk = 1, legs = 1, upperArm = 1, lowerArm = 1, wrist = 1, load = 0, coupling = 0, activity = 0 } = data;
  const neckIdx = Math.max(0, Math.min(Math.floor(neck) - 1, 2));
  const trunkIdx = Math.max(0, Math.min(Math.floor(trunk) - 1, 4));
  const legsIdx = Math.max(0, Math.min(Math.floor(legs) - 1, 3));
  const tableA_layer = REBA_TABLE_A[neckIdx];
  if (!tableA_layer) return null;
  const scoreA_raw = tableA_layer[trunkIdx][legsIdx];
  const scoreA = Math.min(scoreA_raw + load, 12);
  const upperArmIdx = Math.max(0, Math.min(Math.floor(upperArm) - 1, 5));
  const lowerArmIdx = Math.max(0, Math.min(Math.floor(lowerArm) - 1, 2));
  const wristIdx = Math.max(0, Math.min(Math.floor(wrist) - 1, 2));
  const tableB_layer = REBA_TABLE_B[upperArmIdx];
  if (!tableB_layer) return null;
  const scoreB_raw = tableB_layer[lowerArmIdx][wristIdx] || 0;
  const scoreB = Math.min(scoreB_raw + coupling, 12);
  const scoreC = REBA_TABLE_C[Math.min(scoreA-1, 11)][Math.min(scoreB-1, 11)];
  const total = Math.min(scoreC + activity, 15);
  
  const levels: any = {
    1: { en: "Negligible", fa: "بی‌خطر", actionEn: "Action not necessary", actionFa: "اقدام لازم نیست", color: "#16a34a" },
    3: { en: "Low Risk", fa: "پایین", actionEn: "Change may be needed", actionFa: "تغییر ممکن است لازم باشد", color: "#84cc16" },
    7: { en: "Medium Risk", fa: "متوسط", actionEn: "Change is necessary", actionFa: "تغییر لازم است", color: "#f59e0b" },
    10: { en: "High Risk", fa: "بالا", actionEn: "Change soon", actionFa: "تغییر هر چه زودتر", color: "#f97316" },
    15: { en: "Very High Risk", fa: "بسیار بالا", actionEn: "Change immediately", actionFa: "تغییر فوری ضروری", color: "#dc2626" }
  };

  let resKey = 15;
  if (total === 1) resKey = 1;
  else if (total <= 3) resKey = 3;
  else if (total <= 7) resKey = 7;
  else if (total <= 10) resKey = 10;

  const res = levels[resKey];
  return { total, scoreA, scoreB, scoreC, level: res[lang], action: lang === 'en' ? res.actionEn : res.actionFa, color: res.color };
}

const RULA_TABLE_C = [
  [1,2,3,3],[2,2,3,4],[3,3,3,4],[3,3,4,4],[4,4,4,5],[4,4,4,5],[5,5,5,6],[5,5,5,6],
  [6,6,6,7],[6,6,7,7],[7,7,7,7],[7,7,7,8]
];

const RULA_TABLE_D = [
  [1,2,3,3],[2,2,3,4],[3,3,3,4],[3,3,4,4],[4,4,4,5],[4,4,4,5],[5,5,5,6],[5,5,5,6],
  [6,6,6,7],[6,6,7,7],[7,7,7,7],[7,7,7,8]
];

export function calculateRULA(data: Partial<RulaData>, lang: Language) {
  const { upperArm = 1, lowerArm = 1, wrist = 1, wristTwist = 1, neck = 1, trunk = 1, legs = 1, muscle = 0, force = 0 } = data;
  const groupAIdx = Math.min(Math.max(0, Math.floor(upperArm) + Math.floor(lowerArm) - 2), 11);
  const wristIdx = Math.min(Math.max(0, Math.floor(wrist) - 1), 3);
  const groupA = Math.min(RULA_TABLE_C[groupAIdx][wristIdx] + wristTwist - 1, 8);
  const scoreC = Math.min(groupA + muscle + force, 8);
  const groupBIdx = Math.min(Math.max(0, Math.floor(neck) + Math.floor(trunk) - 2), 11);
  const legsIdx = Math.min(Math.max(0, Math.floor(legs) - 1), 3);
  const groupB = Math.min(RULA_TABLE_D[groupBIdx][legsIdx], 8);
  const scoreD = Math.min(groupB + muscle + force, 8);
  const total = Math.max(scoreC, scoreD);

  const levels: any = {
    2: { en: "Acceptable", fa: "قابل قبول", actionEn: "Posture is acceptable", actionFa: "وضعیت قابل قبول", color: "#16a34a" },
    4: { en: "Further investigation", fa: "بررسی لازم است", actionEn: "Investigate and modify", actionFa: "بررسی و بهبود", color: "#f59e0b" },
    6: { en: "Investigate soon", fa: "بررسی سریع", actionEn: "Modify soon", actionFa: "اصلاح هرچه زودتر", color: "#f97316" },
    8: { en: "Investigate immediately", fa: "فوری", actionEn: "Modify immediately", actionFa: "اصلاح فوری", color: "#dc2626" }
  };

  let resKey = 8;
  if (total <= 2) resKey = 2;
  else if (total <= 4) resKey = 4;
  else if (total <= 6) resKey = 6;

  const res = levels[resKey];
  return { total, scoreC, scoreD, level: res[lang], action: lang === 'en' ? res.actionEn : res.actionFa, color: res.color };
}

export function calculateOWAS(data: Partial<OwasData>, lang: Language) {
  const { back = 1, arms = 1, legs = 1, load = 1 } = data;
  const code = `${back}${arms}${legs}${load}`;
  let category: 1 | 2 | 3 | 4;
  if (back === 1 && arms <= 2 && [1,2,3].includes(legs)) category = 1;
  else if (back === 1 && arms <= 3 && [4,5,6].includes(legs)) category = 2;
  else if (back === 2 && arms <= 2 && legs <= 3) category = 2;
  else if (back === 3 || back === 4 || arms === 3) category = 3;
  else category = 4;

  const cats: Record<number, any> = {
    1: { actionEn: "No action needed", actionFa: "بدون نیاز به اقدام", color: "#16a34a", levelEn: "Level 1 - Low", levelFa: "سطح ۱ - کم‌خطر" },
    2: { actionEn: "Action in near future", actionFa: "اقدام در آینده نزدیک", color: "#f59e0b", levelEn: "Level 2 - Med", levelFa: "سطح ۲ - متوسط" },
    3: { actionEn: "Action as soon as possible", actionFa: "اقدام در اسرع وقت", color: "#f97316", levelEn: "Level 3 - High", levelFa: "سطح ۳ - بالا" },
    4: { actionEn: "Action immediately", actionFa: "اقدام فوری", color: "#dc2626", levelEn: "Level 4 - Critical", levelFa: "سطح ۴ - بحرانی" }
  };
  
  const res = cats[category];
  return { category, code, action: lang === 'en' ? res.actionEn : res.actionFa, color: res.color, level: lang === 'en' ? res.levelEn : res.levelFa };
}

export function calculateNIOSH(data: Partial<NioshData>, lang: Language) {
  const { weight = 0, hDist = 25, vDist = 0, vOrigin = 75, asymmetry = 0, coupling = 'good' } = data;
  const HM = Math.min(25 / Math.max(hDist, 25), 1);
  const VM = 1 - 0.003 * Math.abs(vOrigin - 75);
  const DM = 0.82 + 4.5 / Math.max(vDist || 25, 25);
  const AM = 1 - 0.0032 * asymmetry;
  const FM = 0.78; 
  const couplingVals = { good: 1.0, fair: 0.95, poor: 0.9 };
  const CM = couplingVals[coupling as keyof typeof couplingVals] || 0.9;
  const RWL = parseFloat((23 * HM * VM * DM * AM * FM * CM).toFixed(2));
  const LI = isNaN(weight / RWL) ? 0 : parseFloat((weight / RWL).toFixed(2));
  
  const levels: any = {
    1: { en: "Safe", fa: "ایمن", actionEn: "Load is safe", actionFa: "بار بی‌خطر است", color: "#16a34a" },
    2: { en: "Moderate", fa: "ریسک متوسط", actionEn: "Reduce weight or improve", actionFa: "کاهش وزن یا بهبود شرایط", color: "#f59e0b" },
    3: { en: "High Risk", fa: "ریسک بالا", actionEn: "Redesign essential", actionFa: "طراحی مجدد ضروری", color: "#dc2626" }
  };

  let resKey = 3;
  if (LI <= 1) resKey = 1;
  else if (LI <= 2) resKey = 2;

  const res = levels[resKey];
  return { RWL, LI, level: res[lang], action: lang === 'en' ? res.actionEn : res.actionFa, color: res.color, HM, VM, DM, AM, CM };
}

export function generateCorrections(method: string, results: any, formData: any, lang: Language) {
  if (!results) return [];
  const corrections: { title: string; detail: string; icon: string }[] = [];
  const isEn = lang === 'en';

  if (method === "REBA") {
    const { neck, trunk, upperArm, legs } = formData;
    if (neck >= 2) corrections.push({ title: isEn ? "Monitor Height" : "ارتفاع مانیتور", detail: isEn ? "Adjust monitor so eye line is at the top 1/3 of the screen. Recommend: Eye level +/- 5cm." : "ارتفاع مانیتور را به گونه‌ای تنظیم کنید که خط دید به وسط صفحه با زاویه ۱۵-۲۰ درجه به پایین باشد.", icon: "🖥️" });
    if (trunk >= 3) corrections.push({ title: isEn ? "Back Support" : "پشتی صندلی", detail: isEn ? "Use chair with 100-110° back angle. Backrest height: 45-50cm." : "صندلی با پشتی قابل تنظیم با زاویه ۱۰۰-۱۱۰ درجه نسبت به نشیمن استفاده کنید.", icon: "🪑" });
    if (upperArm >= 3) corrections.push({ title: isEn ? "Desk Height" : "ارتفاع میز", detail: isEn ? "Work surface should be at elbow height. Measure: Floor to elbow minus 2-3cm." : "ارتفاع سطح کار باید برابر ارتفاع آرنج (در حالت نشسته) باشد.", icon: "📐" });
    if (legs >= 3) corrections.push({ title: isEn ? "Foot Rest" : "تکیه‌گاه پا", detail: isEn ? "Adjustable footrest (0-15cm height, 5-15° angle) recommended." : "زیرپایی با ارتفاع قابل تنظیم ۰-۱۵ سانتی‌متر توصیه می‌شود.", icon: "🦶" });
    if (results.total > 7) corrections.push({ title: isEn ? "Break Schedule" : "برنامه استراحت", detail: isEn ? "5 min active break every 30 mins. Neck and shoulder stretches." : "هر ۳۰ دقیقه ۵ دقیقه استراحت اکتیو با کشش‌های گردن و شانه.", icon: "⏱️" });
  } else if (method === "RULA") {
    corrections.push({ title: isEn ? "Armrest" : "آرمچر", detail: isEn ? "Armrest at elbow height (20-25cm from seat). Width: shoulder width." : "دسته صندلی باید در ارتفاع آرنج (۲۰-۲۵ سانتی‌متر از نشیمن) قرار گیرد.", icon: "💪" });
    corrections.push({ title: isEn ? "Keyboard Pos." : "موقعیت کیبورد", detail: isEn ? "At elbow height, 10-15cm from body. Negative tilt 0-15°." : "کیبورد در ارتفاع آرنج، فاصله از بدن ۱۰-۱۵ سانتی‌متر.", icon: "⌨️" });
    if (formData.neck > 2) corrections.push({ title: isEn ? "Doc Holder" : "نگهدارنده اسناد", detail: isEn ? "Use document holder beside monitor to eliminate neck bending." : "از داکیومنت هولدر استفاده کنید تا خم شدن گردن حذف شود.", icon: "📄" });
  } else if (method === "OWAS") {
    if (formData.back >= 3) corrections.push({ title: isEn ? "Standing Work" : "طراحی کار ایستاده", detail: isEn ? "Work height: elbow +/- 5cm. Use anti-fatigue mat (15-20mm)." : "ارتفاع کار ایستاده: ارتفاع آرنج +/- ۵ سانتی‌متر. از کفپوش ضد خستگی استفاده کنید.", icon: "🏗️" });
    corrections.push({ title: isEn ? "Incline Board" : "صفحه شیب‌دار", detail: isEn ? "For precision work: 15-45° inclined table reduces back flexion." : "برای کارهای دقیق: میز با زاویه ۱۵-۴۵ درجه برای کاهش خمش پشت.", icon: "📐" });
  } else if (method === "NIOSH") {
    corrections.push({ title: isEn ? "Weight Reduction" : "کاهش وزن بار", detail: isEn ? `Recommended: ${results.RWL}kg. Split load if heavier.` : `وزن توصیه‌شده: ${results.RWL} کیلوگرم. اگر بار سنگین‌تر است آن را تقسیم کنید.`, icon: "⚖️" });
    corrections.push({ title: isEn ? "Improve Distance" : "بهبود فاصله", detail: isEn ? "Keep load closer to body. Ideal: 25cm. Use tools or carts." : "بار را نزدیک‌تر به بدن نگه دارید. فاصله ایده‌آل: ۲۵ سانتی‌متر.", icon: "📏" });
  }
  return corrections;
}

export const METHOD_METADATA = {
  REBA: { en: "REBA", fa: "REBA", fullEn: "Rapid Entire Body Assessment", fullFa: "ارزیابی سریع کل بدن", icon: "🧍", descEn: "Whole body assessment - Multi-task", descFa: "ارزیابی کل بدن - مناسب برای کارهای متنوع", color: "#1f6feb" },
  RULA: { en: "RULA", fa: "RULA", fullEn: "Rapid Upper Limb Assessment", fullFa: "ارزیابی اندام فوقانی", icon: "💪", descEn: "Upper limb focus - Manual tasks", descFa: "ارزیابی اندام فوقانی - مناسب برای کارهای دستی", color: "#388bfd" },
  OWAS: { en: "OWAS", fa: "OWAS", fullEn: "Ovako Working Posture Analysis", fullFa: "آنالیز پوسچر اوواکو", icon: "🏗️", descEn: "Industrial posture analysis", descFa: "ارزیابی پوسچر کاری - مناسب برای کارهای صنعتی", color: "#3fb950" },
  NIOSH: { en: "NIOSH", fa: "NIOSH", fullEn: "NIOSH Lifting Equation", fullFa: "معادله بلند کردن نایوش", icon: "📦", descEn: "Safe lifting calculations", descFa: "معادله بلند کردن NIOSH - مناسب برای جابجایی بار", color: "#e3b341" },
};

export const REBA_FIELDS = {
  neck: { labelEn: "Neck", labelFa: "گردن", min: 1, max: 3, en: ["1: <20°", "2: >20°/twisted", "3: Extension"], fa: ["۱: کمتر از ۲۰°", "۲: بیش از ۲۰°/انحراف", "۳: به عقب"], helpEn: "Assess neck flexion angle", helpFa: "زاویه خم شدن گردن را ارزیابی کنید" },
  trunk: { labelEn: "Trunk", labelFa: "تنه", min: 1, max: 5, en: ["1: Straight", "2: 0-20°", "3: 20-60°", "4: >60°", "5: Twisted"], fa: ["۱: صاف", "۲: ۰-۲۰°", "۳: ۲۰-۶۰°", "۴: بیش از ۶۰°", "۵: انحراف"], helpEn: "Assess trunk flexion angle", helpFa: "زاویه خم شدن تنه را ارزیابی کنید" },
  legs: { labelEn: "Legs", labelFa: "پاها", min: 1, max: 4, en: ["1: Sitting", "2: Standing 2 legs", "3: One leg", "4: Knees >60°"], fa: ["۱: نشسته", "۲: ایستاده دو پا", "۳: یک پا", "۴: زانو > ۶۰°"], helpEn: "Assess leg support", helpFa: "وضعیت پاها را ارزیابی کنید" },
  upperArm: { labelEn: "Upper Arm", labelFa: "بازو", min: 1, max: 6, en: ["1: 20° fwd/bk", "2: 20-45°", "3: 45-90°", "4: >90°", "5: Raised", "6: Supported"], fa: ["۱: ۲۰° جلو/عقب", "۲: ۲۰-۴۵°", "۳: ۴۵-۹۰°", "۴: بیش از ۹۰°", "۵: شانه بالا", "۶: تکیه‌گاه"], helpEn: "Upper arm relative to torso", helpFa: "زاویه بازو نسبت به بدن" },
  lowerArm: { labelEn: "Lower Arm", labelFa: "ساعد", min: 1, max: 3, en: ["1: 60-100°", "2: <60°", "3: >100°"], fa: ["۱: ۶۰-۱۰۰°", "۲: کمتر از ۶۰°", "۳: بیش از ۱۰۰°"], helpEn: "Elbow angle", helpFa: "زاویه آرنج" },
  wrist: { labelEn: "Wrist", labelFa: "مچ", min: 1, max: 3, en: ["1: Neutral", "2: 0-15° flexion", "3: >15° flexion"], fa: ["۱: صاف", "۲: خم ۰-۱۵°", "۳: خم بیش از ۱۵°"], helpEn: "Wrist deviation", helpFa: "انحراف مچ دست" },
  load: { labelEn: "Load / Force", labelFa: "بار / نیرو", min: 0, max: 3, en: ["0: <5kg", "1: 5-10kg", "2: >10kg", "3: Shock/Force"], fa: ["۰: کمتر از ۵ کیلو", "۱: ۵-۱۰ کیلو", "۲: بیش از ۱۰ کیلو", "۳: شوک ناگهانی"], helpEn: "Weight or external force", helpFa: "وزن بار یا نیروی خارجی" },
  coupling: { labelEn: "Coupling", labelFa: "نحوه گرفتن", min: 0, max: 3, en: ["0: Good", "1: Fair", "2: Poor", "3: Unacceptable"], fa: ["۰: خوب", "۱: متوسط", "۲: بد", "۳: ناپذیرفتنی"], helpEn: "Quality of grip", helpFa: "کیفیت گرفتن ابزار" },
  activity: { labelEn: "Activity", labelFa: "فعالیت", min: 0, max: 3, en: ["0: Static", "1: Repetitive", "2: Rapid change", "3: Unstable"], fa: ["۰: ثابت", "۱: تکراری", "۲: تغییر سریع", "۳: ناپایدار"], helpEn: "Task nature", helpFa: "ماهیت فعالیت" },
};

export const RULA_FIELDS = {
  upperArm: { labelEn: "Upper Arm", labelFa: "بازو", min: 1, max: 6, en: ["1: 20° fwd/bk", "2: 20-45°", "3: 45-90°", "4: >90°", "5: Raised", "6: Supported"], fa: ["۱: ۲۰° جلو/عقب", "۲: ۲۰-۴۵°", "۳: ۴۵-۹۰°", "۴: بیش از ۹۰°", "۵: شانه بالا", "۶: تکیه‌گاه"], helpEn: "Upper arm angle", helpFa: "زاویه بازو" },
  lowerArm: { labelEn: "Lower Arm", labelFa: "ساعد", min: 1, max: 3, en: ["1: 60-100°", "2: <60°", "3: >100°"], fa: ["۱: ۶۰-۱۰۰°", "۲: کمتر از ۶۰°", "۳: بیش از ۱۰۰°"], helpEn: "Elbow flexion", helpFa: "خم شدن آرنج" },
  wrist: { labelEn: "Wrist", labelFa: "مچ", min: 1, max: 4, en: ["1: Neutral", "2: Dev-Small", "3: Flex-15°+", "4: Flex+Dev"], fa: ["۱: صاف", "۲: انحراف کم", "۳: خم ۱۵°+", "۴: خم+انحراف"], helpEn: "Wrist posture", helpFa: "وضعیت مچ" },
  wristTwist: { labelEn: "Wrist Twist", labelFa: "چرخش مچ", min: 1, max: 2, en: ["1: Mid-range", "2: End-range"], fa: ["۱: در محدوده", "۲: انتهای محدوده"], helpEn: "Twisting of wrist", helpFa: "چرخش مچ" },
  neck: { labelEn: "Neck", labelFa: "گردن", min: 1, max: 6, en: ["1: 0-10°", "2: 10-20°", "3: >20°", "4: Extension", "5: Dev", "6: Twisted"], fa: ["۱: ۰-۱۰°", "۲: ۱۰-۲۰°", "۳: >۲۰°", "۴: به عقب", "۵: انحراف", "۶: چرخش"], helpEn: "Neck posture", helpFa: "وضعیت گردن" },
  trunk: { labelEn: "Trunk", labelFa: "تنه", min: 1, max: 6, en: ["1: Straight", "2: 0-20°", "3: 20-60°", "4: >60°", "5: Dev", "6: Twisted"], fa: ["۱: صاف", "۲: ۰-۲۰°", "۳: ۲۰-۶۰°", "۴: بیش از ۶۰°", "۵: انحراف", "۶: چرخش"], helpEn: "Trunk posture", helpFa: "وضعیت تنه" },
  legs: { labelEn: "Legs", labelFa: "پاها", min: 1, max: 2, en: ["1: Supported", "2: Unbalanced"], fa: ["۱: تکیه‌گاه دار", "۲: نامتعادل"], helpEn: "Leg stability", helpFa: "پایداری پاها" },
  muscle: { labelEn: "Muscle", labelFa: "عضله", min: 0, max: 1, en: ["0: Intermittent", "1: Static >1min"], fa: ["۰: متناوب", "۱: ثابت >۱دقیقه"], helpEn: "Duration/Repetition", helpFa: "تکرار یا ایستایی" },
  force: { labelEn: "Force", labelFa: "نیرو", min: 0, max: 3, en: ["0: <2kg", "1: 2-10kg", "2: >10kg", "3: Sudden"], fa: ["۰: <۲کیلو", "۱: ۲-۱۰کیلو", "۲: >۱۰کیلو", "۳: ناگهانی"], helpEn: "Load handled", helpFa: "بار جابجا شده" },
};

export const OWAS_FIELDS = {
  back: { labelEn: "Back", labelFa: "پشت", min: 1, max: 4, en: ["1: Straight", "2: Bended", "3: Twisted", "4: Bend+Twist"], fa: ["۱: صاف", "۲: خم شده", "۳: چرخیده", "۴: خم+چرخش"], helpEn: "Back posture", helpFa: "وضعیت پشت" },
  arms: { labelEn: "Arms", labelFa: "بازوها", min: 1, max: 3, en: ["1: Both down", "2: One up", "3: Both up"], fa: ["۱: هر دو پایین", "۲: یکی بالا", "۳: هر دو بالا"], helpEn: "Arms relative to shoulders", helpFa: "موقعیت بازوها" },
  legs: { labelEn: "Legs", labelFa: "پاها", min: 1, max: 7, en: ["1: Sitting", "2: Stand 2 straight", "3: Stand 1 straight", "4: Stand 2 bended", "5: Stand 1 bended", "6: Kneeling", "7: Walking"], fa: ["۱: نشسته", "۲: ایستاده ۲ صاف", "۳: ایستاده ۱ صاف", "۴: ایستاده ۲ خم", "۵: ایستاده ۱ خم", "۶: زانو زدن", "۷: راه رفتن"], helpEn: "Leg posture", helpFa: "وضعیت پاها" },
  load: { labelEn: "Load", labelFa: "بار", min: 1, max: 3, en: ["1: <10kg", "2: 10-20kg", "3: >20kg"], fa: ["۱: <۱۰کیلو", "۲: ۱۰-۲۰کیلو", "۳: >۲۰کیلو"], helpEn: "Weight handled", helpFa: "وزن بار" },
};
