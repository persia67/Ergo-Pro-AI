
export type MethodType = 'REBA' | 'RULA' | 'OWAS' | 'NIOSH';
export type Language = 'en' | 'fa';
export type Theme = 'dark' | 'light';

export interface AssessmentMetadata {
  jobTitle: string;
  assessor: string;
  evalee: string;
  date: string;
}

export interface AssessmentSession {
  id: string;
  timestamp: number;
  method: MethodType;
  metadata: AssessmentMetadata;
  formData: any;
  results: any;
  image: string | null;
}

export interface Correction {
  title: string;
  detail: string;
  icon: string;
}

export interface RebaData {
  neck: number;
  trunk: number;
  legs: number;
  upperArm: number;
  lowerArm: number;
  wrist: number;
  load: number;
  coupling: number;
  activity: number;
}

export interface RulaData {
  upperArm: number;
  lowerArm: number;
  wrist: number;
  wristTwist: number;
  neck: number;
  trunk: number;
  legs: number;
  muscle: number;
  force: number;
}

export interface OwasData {
  back: number;
  arms: number;
  legs: number;
  load: number;
}

export interface NioshData {
  weight: number;
  hDist: number;
  vDist: number;
  vOrigin: number;
  asymmetry: number;
  frequency: number;
  duration: number;
  coupling: 'good' | 'fair' | 'poor';
}
