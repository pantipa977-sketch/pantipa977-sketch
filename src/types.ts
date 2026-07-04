export interface ReportRequest {
  id: string;
  requesterName: string;
  requesterPhone: string;
  department: string;
  reportType: string;
  purpose: string;
  detailedDescription?: string;
  sampleFileName?: string;
  sampleFileData?: string;
  urgency?: 'normal' | 'urgent';
  urgencyReason?: string;
  neededDate?: string;
  status: 'pending' | 'processing' | 'completed';
  requestDate: string;
  completedDate?: string;
  adminNotes?: string;
  itOperator?: string;
  userId: string;
  createdAt?: string;
  updatedAt?: string;
}

export const REPORT_TYPES = [
  'Excel',
  'รายงานในระบบ Hosxp',
  'DashBroad BI',
  'เว็บแอพพลิเคชั่น',
  'อื่น ๆ'
];

export const DEPARTMENTS = [
  'แผนกผู้ป่วยนอก',
  'แผนกห้องฉุกเฉิน',
  'งานประกันสุขภาพ',
  'ห้องเวชระเบียน',
  'งานการเงิน',
  'งานเภสัช',
  'งานส่งเสริมสุขภาพ',
  'งานปฐมภูมิ',
  'งานธุรการ',
  'แผนกอายุรกรรม',
  'แผนกศัลยกรรม',
  'แผนกจักษุ',
  'แผนกศัลยกรรมกระดูก',
  'แผนกห้องผ่าตัด',
  'แผนก ICU',
  'แผนกกุมารเวชกรรม',
  'แผนกทันตกรรม',
  'อื่น ๆ'
];

export const IT_OPERATORS = [
  'ชัชวาล  ทองสุข',
  'พรรณทิพา  เจียมพลับ',
  'อุดร  บุญชัยยัง',
  'รัตติยา  ชื่นใจ'
];

