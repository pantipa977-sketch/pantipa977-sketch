import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { FileText, Send, AlertCircle, Sparkles, Building2, Layers, UserCheck, HelpCircle, Phone, Upload, X, File, Paperclip } from 'lucide-react';
import { REPORT_TYPES, DEPARTMENTS } from '../types';

interface ReportRequestFormProps {
  user: User | null;
  onSubmit: (data: {
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
  }) => Promise<void>;
}

export default function ReportRequestForm({ user, onSubmit }: ReportRequestFormProps) {
  const [requesterName, setRequesterName] = useState('');
  const [requesterPhone, setRequesterPhone] = useState('');
  const [department, setDepartment] = useState('');
  const [reportType, setReportType] = useState('');
  const [purpose, setPurpose] = useState('');
  const [detailedDescription, setDetailedDescription] = useState('');
  const [sampleFileName, setSampleFileName] = useState('');
  const [sampleFileData, setSampleFileData] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [urgency, setUrgency] = useState<'normal' | 'urgent'>('normal');
  const [urgencyReason, setUrgencyReason] = useState('');
  const [neededDate, setNeededDate] = useState('');
  
  const [customDepartment, setCustomDepartment] = useState('');
  const [customReportType, setCustomReportType] = useState('');

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleFileChange = (file: File | null) => {
    if (!file) return;
    
    // Size check (max 500KB for Firestore inline document size compliance)
    if (file.size > 500 * 1024) {
      setError('ไฟล์มีขนาดใหญ่เกินไป (จำกัดไม่เกิน 500 KB) กรุณาใช้ไฟล์ตัวอย่างขนาดเล็ก');
      return;
    }
    
    setError('');
    setSampleFileName(file.name);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        setSampleFileData(e.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const removeFile = () => {
    setSampleFileName('');
    setSampleFileData('');
  };

  // Auto-fill fields from user profile on sign-in
  useEffect(() => {
    if (user) {
      setRequesterName(user.displayName || '');
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    // Validation
    const finalName = requesterName.trim();
    const finalPhone = requesterPhone.trim();
    const finalDept = (department === 'อื่น ๆ') ? customDepartment.trim() : department;
    const finalType = (reportType === 'อื่น ๆ') ? customReportType.trim() : reportType;
    const finalPurpose = purpose.trim();

    if (!finalName) {
      setError('กรุณาระบุชื่อผู้ขอรายงาน');
      return;
    }
    if (!finalPhone) {
      setError('กรุณาระบุเบอร์โทรศัพท์ติดต่อ');
      return;
    }
    if (!finalDept) {
      setError('กรุณาเลือกหรือระบุหน่วยงาน');
      return;
    }
    if (!finalType) {
      setError('กรุณาเลือกหรือระบุประเภทรายงานที่ต้องการ');
      return;
    }
    if (urgency === 'urgent') {
      if (!neededDate) {
        setError('กรุณาระบุวันที่ต้องการได้รับข้อมูลสำหรับคำขอเร่งด่วน');
        return;
      }
      if (!urgencyReason.trim()) {
        setError('กรุณาระบุเหตุผลความจำเป็นเร่งด่วน');
        return;
      }
    }
    if (!finalPurpose || finalPurpose.length < 10) {
      setError('กรุณาระบุวัตถุประสงค์ความยาวอย่างน้อย 10 ตัวอักษร');
      return;
    }

    try {
      setLoading(true);
      await onSubmit({
        requesterName: finalName,
        requesterPhone: finalPhone,
        department: finalDept,
        reportType: finalType,
        purpose: finalPurpose,
        detailedDescription: detailedDescription.trim(),
        sampleFileName,
        sampleFileData,
        urgency,
        urgencyReason: urgency === 'urgent' ? urgencyReason.trim() : undefined,
        neededDate: urgency === 'urgent' ? neededDate : undefined,
      });
      
      // Reset form (except user identity)
      setPurpose('');
      setDetailedDescription('');
      setSampleFileName('');
      setSampleFileData('');
      setUrgency('normal');
      setNeededDate('');
      setUrgencyReason('');
      setDepartment('');
      setReportType('');
      setCustomDepartment('');
      setCustomReportType('');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 5000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'เกิดข้อผิดพลาดในการบันทึกข้อมูล');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div id="form-unauthenticated-banner" className="bg-slate-800/40 border border-slate-700/60 p-8 rounded-2xl text-center backdrop-blur-sm shadow-xl">
        <FileText className="h-12 w-12 text-slate-500 mx-auto mb-4" />
        <h3 className="text-lg font-semibold text-slate-200 mb-2 font-sans">ลงชื่อเข้าสู่ระบบเพื่อยื่นคำขอรายงาน</h3>
        <p className="text-sm text-slate-400 max-w-md mx-auto mb-6">
          กรุณาเข้าสู่ระบบด้วยบัญชี Google เพื่อความถูกต้องในการระบุตัวตนบุคคล และความปลอดภัยในการเข้าถึงสถิติรายงานข้อมูลสุขภาพดิจิทัล
        </p>
      </div>
    );
  }

  return (
    <div id="request-form-container" className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      {/* Form Header */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-700 border-b border-blue-500/20 px-6 py-6 text-white">
        <div className="flex items-center space-x-2.5">
          <FileText className="h-6 w-6 text-white" />
          <h2 className="text-lg sm:text-xl font-black font-sans tracking-tight">แบบฟอร์มยื่นคำขอรายงานข้อมูล</h2>
        </div>
        <p className="text-xs sm:text-sm text-blue-100 font-sans mt-1">กรอกรายละเอียดเพื่อขออนุมัติดึงข้อมูลจากกลุ่มงานสุขภาพดิจิทัล</p>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-5">
        {/* Alerts */}
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-lg text-sm flex items-start space-x-2 animate-fade-in">
            <AlertCircle className="h-5 w-5 flex-shrink-0 text-rose-500 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm flex items-start space-x-2 animate-fade-in">
            <Sparkles className="h-5 w-5 flex-shrink-0 text-green-500 mt-0.5" />
            <span>ส่งคำขอรายงานข้อมูลสุขภาพเรียบร้อยแล้ว! เจ้าหน้าที่จะดำเนินการและแจ้งเตือนกลับ</span>
          </div>
        )}

        {/* Requester Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5 flex items-center">
              <UserCheck className="h-3.5 w-3.5 mr-1 text-slate-400" />
              ชื่อผู้ขอรายงาน *
            </label>
            <input
              type="text"
              value={requesterName}
              onChange={(e) => setRequesterName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm"
              placeholder="เช่น นายแพทย์สมชาย รักดี"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5 flex items-center">
              <Phone className="h-3.5 w-3.5 mr-1 text-slate-400" />
              เบอร์โทรศัพท์ติดต่อ *
            </label>
            <input
              type="tel"
              value={requesterPhone}
              onChange={(e) => setRequesterPhone(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm"
              placeholder="เช่น 081-234-5678"
              required
            />
          </div>
        </div>

        {/* Department */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5 flex items-center">
            <Building2 className="h-3.5 w-3.5 mr-1 text-slate-400" />
            หน่วยงาน *
          </label>
          
          <div className="space-y-3">
            <select
              value={department}
              onChange={(e) => {
                setDepartment(e.target.value);
                if (e.target.value !== 'อื่น ๆ') {
                  setCustomDepartment('');
                }
              }}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm"
            >
              <option value="">-- โปรดเลือกหน่วยงาน --</option>
              {DEPARTMENTS.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>

            {department === 'อื่น ๆ' && (
              <input
                type="text"
                value={customDepartment}
                onChange={(e) => setCustomDepartment(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm animate-fade-in"
                placeholder="ระบุชื่อหน่วยงานของคุณ..."
                required={department === 'อื่น ๆ'}
              />
            )}
          </div>
        </div>

        {/* Report Type */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5 flex items-center">
            <Layers className="h-3.5 w-3.5 mr-1 text-slate-400" />
            ประเภทรายงานข้อมูลที่ต้องการดึง *
          </label>
          
          <div className="space-y-3">
            <select
              value={reportType}
              onChange={(e) => {
                setReportType(e.target.value);
                if (e.target.value !== 'อื่น ๆ') {
                  setCustomReportType('');
                }
              }}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm"
            >
              <option value="">-- โปรดเลือกประเภทรายงานมาตรฐาน --</option>
              {REPORT_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>

            {reportType === 'อื่น ๆ' && (
              <input
                type="text"
                value={customReportType}
                onChange={(e) => setCustomReportType(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm animate-fade-in"
                placeholder="ระบุชื่อประเภทรายงานของคุณ..."
                required={reportType === 'อื่น ๆ'}
              />
            )}
          </div>
        </div>

        {/* Urgency Level and Target Date */}
        <div className="bg-slate-50/50 dark:bg-slate-950/20 border border-slate-100 dark:border-slate-800/40 p-4 rounded-xl space-y-3">
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1 flex items-center">
            <AlertCircle className="h-3.5 w-3.5 mr-1 text-slate-400" />
            ระดับความเร่งด่วนของรายงาน *
          </label>
          <div className="flex flex-wrap items-center gap-4">
            <label className="inline-flex items-center space-x-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="radio"
                name="urgency"
                value="normal"
                checked={urgency === 'normal'}
                onChange={() => {
                  setUrgency('normal');
                  setNeededDate('');
                  setUrgencyReason('');
                }}
                className="text-blue-600 focus:ring-blue-500/20 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
              <span>ทั่วไป (Normal) - ดำเนินการตามลำดับคำขอ</span>
            </label>
            <label className="inline-flex items-center space-x-2 text-sm text-slate-700 dark:text-slate-300 cursor-pointer">
              <input
                type="radio"
                name="urgency"
                value="urgent"
                checked={urgency === 'urgent'}
                onChange={() => setUrgency('urgent')}
                className="text-blue-600 focus:ring-blue-500/20 border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
              />
              <span className="text-orange-600 dark:text-orange-400 font-semibold">
                เร่งด่วน (Urgent) - ต้องระบุวันที่และเหตุผล
              </span>
            </label>
          </div>

          {urgency === 'urgent' && (
            <div className="pt-2 border-t border-dashed border-slate-200 dark:border-slate-800 animate-fade-in space-y-3 text-xs">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  ระบุวันที่ต้องการได้รับข้อมูล *
                </label>
                <input
                  type="date"
                  value={neededDate}
                  onChange={(e) => setNeededDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full px-4 py-2 bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm"
                  required={urgency === 'urgent'}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5">
                  ระบุเหตุผลความจำเป็นที่ต้องการเร่งด่วน *
                </label>
                <textarea
                  value={urgencyReason}
                  onChange={(e) => setUrgencyReason(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-2 bg-white dark:bg-slate-950 rounded-lg border border-slate-200 dark:border-slate-800 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm resize-none"
                  placeholder="เช่น ต้องใช้ส่งรายงานสรุปสถานการณ์โรคระบาดเร่งด่วนต่อผู้บริหาร หรือการสอบสวนโรค..."
                  required={urgency === 'urgent'}
                />
              </div>

              <p className="text-[10px] text-orange-500 mt-1">
                * คำขอเร่งด่วนควรใช้เฉพาะกรณีเร่งด่วนทางระบาดวิทยา การสอบสวนโรค หรือนโยบายสาธารณสุขเร่งด่วนเท่านั้น
              </p>
            </div>
          )}
        </div>

        {/* Purpose */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5 flex items-center">
            <HelpCircle className="h-3.5 w-3.5 mr-1 text-slate-400" />
            วัตถุประสงค์ในการนำข้อมูลไปใช้งาน *
          </label>
          <textarea
            value={purpose}
            onChange={(e) => setPurpose(e.target.value)}
            rows={4}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm resize-none"
            placeholder="โปรดระบุวัตถุประสงค์ โครงการวิจัย หรือหน่วยงานปลายทางที่จะนำข้อมูลชุดนี้ไปเผยแพร่หรือใช้งานให้ละเอียด (อย่างน้อย 10 ตัวอักษร)"
            required
          ></textarea>
          <p className="text-[11px] text-slate-400 mt-1">
            * ข้อมูลทั้งหมดจะถูกตรวจสอบตามมาตรการความลับข้อมูลคนไข้และพระราชบัญญัติคุ้มครองข้อมูลส่วนบุคคล (PDPA)
          </p>
        </div>

        {/* Detailed Description */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5 flex items-center">
            <FileText className="h-3.5 w-3.5 mr-1 text-slate-400" />
            รายละเอียดของข้อมูลที่ต้องการเพิ่มเติม (เช่น ชื่อฟิลด์ เงื่อนไข หรือฟิลเตอร์ที่ต้องการ)
          </label>
          <textarea
            value={detailedDescription}
            onChange={(e) => setDetailedDescription(e.target.value)}
            rows={4}
            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:text-slate-100 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none transition-all text-sm resize-none"
            placeholder="ระบุชื่อคอลัมน์หรือเงื่อนไข เช่น ต้องการ HN, ชื่อ-นามสกุล, โรคหลัก, รหัสวินิจฉัย ICD-10 หรือตัวกรองช่วงอายุ ฯลฯ"
          ></textarea>
        </div>

        {/* Sample File Upload */}
        <div>
          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider mb-1.5 flex items-center">
            <Paperclip className="h-3.5 w-3.5 mr-1 text-slate-400" />
            แนบไฟล์ตัวอย่างรูปแบบข้อมูล (ถ้ามี)
          </label>
          
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/20'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-950/10'
            }`}
            onClick={() => document.getElementById('file-upload-input')?.click()}
          >
            <input
              id="file-upload-input"
              type="file"
              className="hidden"
              accept=".xls,.xlsx,.csv,.txt,.pdf,image/*"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileChange(e.target.files[0]);
                }
              }}
            />
            
            {!sampleFileName ? (
              <div className="space-y-2">
                <div className="mx-auto w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400">
                  <Upload className="h-5 w-5" />
                </div>
                <div className="text-sm">
                  <span className="font-semibold text-blue-600 dark:text-blue-400">คลิกเพื่ออัปโหลด</span>
                  <span className="text-slate-500"> หรือลากไฟล์มาวางที่นี่</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  รองรับไฟล์รูปแบบ Excel, PDF, CSV, TXT หรือรูปภาพตัวอย่าง (ขนาดไม่เกิน 500 KB)
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3 rounded-lg animate-fade-in" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center space-x-3 text-left">
                  <div className="p-2 bg-blue-50 dark:bg-blue-950/40 rounded-lg text-blue-600 dark:text-blue-400">
                    <File className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate max-w-[180px] sm:max-w-xs">
                      {sampleFileName}
                    </p>
                    <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">แนบไฟล์สำเร็จ</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile();
                  }}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full text-slate-400 hover:text-rose-500 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Submit button */}
        <button
          type="submit"
          disabled={loading}
          className={`w-full py-3.5 px-4 rounded-xl text-white font-bold text-sm flex items-center justify-center space-x-2 shadow-md hover:shadow-lg transition-all ${
            loading
              ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 active:scale-[0.99] shadow-blue-600/10 hover:shadow-blue-600/20'
          }`}
        >
          {loading ? (
            <div className="h-5 w-5 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
          ) : (
            <>
              <Send className="h-4 w-4" />
              <span>ส่งคำขอเสนอรับรายงาน (Submit Request)</span>
            </>
          )}
        </button>
      </form>
    </div>
  );
}
