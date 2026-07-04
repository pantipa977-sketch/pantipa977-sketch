import { useState } from 'react';
import { User } from 'firebase/auth';
import { ReportRequest, IT_OPERATORS } from '../types';
import { Search, Calendar, CheckCircle2, Clock, Trash2, Edit3, ChevronDown, ChevronUp, UserCheck, CheckSquare, MessageSquare, AlertCircle, FileSpreadsheet, Download, FileText, Paperclip, File } from 'lucide-react';

interface RequestListProps {
  requests: ReportRequest[];
  user: User | null;
  onUpdateStatus: (id: string, status: 'pending' | 'processing' | 'completed', adminNotes: string, itOperator: string) => Promise<void>;
  onDeleteRequest: (id: string) => Promise<void>;
}

export default function RequestList({ requests, user, onUpdateStatus, onDeleteRequest }: RequestListProps) {
  const [activeTab, setActiveTab] = useState<'all' | 'my'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'processing' | 'completed'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Editing state for Admin Updates
  const [editingId, setEditingId] = useState<string | null>(null);
  const [adminNotesInput, setAdminNotesInput] = useState('');
  const [itOperatorInput, setItOperatorInput] = useState('');
  const [statusInput, setStatusInput] = useState<'pending' | 'processing' | 'completed'>('pending');
  const [updating, setUpdating] = useState(false);

  // Quick Accept states
  const [acceptingId, setAcceptingId] = useState<string | null>(null);
  const [selectedOperatorForAccept, setSelectedOperatorForAccept] = useState<string>('');
  const [quickAccepting, setQuickAccepting] = useState(false);

  // 1. Filtered requests
  const filteredRequests = requests.filter(req => {
    // Tab Filter (All vs My Requests)
    if (activeTab === 'my' && (!user || req.userId !== user.uid)) {
      return false;
    }

    // Status Filter
    if (statusFilter !== 'all' && req.status !== statusFilter) {
      return false;
    }

    // Search term filter
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      const matchName = req.requesterName.toLowerCase().includes(term);
      const matchPhone = req.requesterPhone.toLowerCase().includes(term);
      const matchDept = req.department.toLowerCase().includes(term);
      const matchType = req.reportType.toLowerCase().includes(term);
      const matchPurpose = req.purpose.toLowerCase().includes(term);

      return matchName || matchPhone || matchDept || matchType || matchPurpose;
    }

    return true;
  });

  const handleExportToExcel = () => {
    if (filteredRequests.length === 0) {
      alert('ไม่มีข้อมูลสำหรับส่งออก');
      return;
    }

    // Header row
    const headers = [
      'ลำดับ',
      'วันที่ขอ',
      'ชื่อผู้ขอรายงาน',
      'เบอร์โทรศัพท์',
      'หน่วยงาน/แผนก',
      'ประเภทรายงาน',
      'วัตถุประสงค์การนำไปใช้',
      'ความเร่งด่วน',
      'เหตุผลความเร่งด่วน',
      'วันที่ต้องการข้อมูล',
      'สถานะ',
      'ผู้รับผิดชอบ (IT)',
      'บันทึกติดตามงาน',
      'วันที่ดำเนินการสำเร็จ'
    ];

    // Data rows
    const csvRows = filteredRequests.map((req, index) => {
      const urgencyText = req.urgency === 'urgent' ? 'ด่วน' : 'ปกติ';
      let statusText = 'รอรับเรื่อง';
      if (req.status === 'processing') statusText = 'กำลังดำเนินการ';
      if (req.status === 'completed') statusText = 'สำเร็จแล้ว';

      return [
        index + 1,
        req.requestDate || '',
        req.requesterName || '',
        req.requesterPhone || '',
        req.department || '',
        req.reportType || '',
        (req.purpose || '').replace(/\r?\n/g, ' '), // remove newlines to prevent broken CSV rows
        urgencyText,
        (req.urgencyReason || '').replace(/\r?\n/g, ' '),
        req.neededDate || '',
        statusText,
        req.itOperator || '',
        (req.adminNotes || '').replace(/\r?\n/g, ' '),
        req.completedDate || ''
      ];
    });

    // Combine headers and rows
    const csvContent = [
      headers.join(','),
      ...csvRows.map(row => 
        row.map(value => {
          // Escape quotes and wrap in quotes if contains comma, quotes or newlines
          const stringVal = String(value);
          if (stringVal.includes(',') || stringVal.includes('"') || stringVal.includes('\n')) {
            return `"${stringVal.replace(/"/g, '""')}"`;
          }
          return stringVal;
        }).join(',')
      )
    ].join('\n');

    // Add BOM for Excel Thai language support
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], {
      type: 'text/csv;charset=utf-8;'
    });

    // Create download link
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    
    // Generate descriptive file name with date
    const dateStr = new Date().toLocaleDateString('th-TH', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).replace(/\//g, '-');
    
    link.setAttribute('download', `รายงานการขอข้อมูล_กลุ่มงานสุขภาพดิจิทัล_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleExpand = (id: string) => {
    if (expandedId === id) {
      setExpandedId(null);
      setEditingId(null);
    } else {
      setExpandedId(id);
      setEditingId(null);
    }
  };

  const startEditing = (req: ReportRequest) => {
    setEditingId(req.id);
    setStatusInput(req.status);
    setAdminNotesInput(req.adminNotes || '');
    setItOperatorInput(req.itOperator || '');
  };

  const handleSaveUpdate = async (id: string) => {
    if (statusInput !== 'pending' && !itOperatorInput.trim()) {
      alert('กรุณาระบุเจ้าหน้าที่ IT ที่ดำเนินการจัดทำ');
      return;
    }
    try {
      setUpdating(true);
      await onUpdateStatus(id, statusInput, adminNotesInput.trim(), itOperatorInput.trim());
      setEditingId(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'ไม่สามารถอัปเดตสถานะได้');
    } finally {
      setUpdating(false);
    }
  };

  const matchOperator = () => {
    if (!user) return '';
    const email = (user.email || '').toLowerCase();
    const displayName = (user.displayName || '').toLowerCase();
    if (email.includes('pantipa') || displayName.includes('pantipa') || displayName.includes('พรรณทิพา')) {
      return 'พรรณทิพา  เจียมพลับ';
    }
    if (email.includes('chatchawal') || displayName.includes('chatchawal') || displayName.includes('ชัชวาล')) {
      return 'ชัชวาล  ทองสุข';
    }
    if (email.includes('udon') || displayName.includes('udon') || displayName.includes('อุดร')) {
      return 'อุดร  บุญชัยยัง';
    }
    if (email.includes('rattiya') || displayName.includes('rattiya') || displayName.includes('รัตติยา')) {
      return 'รัตติยา  ชื่นใจ';
    }
    return '';
  };

  const handleStartQuickAccept = (req: ReportRequest) => {
    setAcceptingId(req.id);
    const matched = matchOperator();
    setSelectedOperatorForAccept(matched);
  };

  const handleConfirmQuickAccept = async (id: string) => {
    if (!selectedOperatorForAccept.trim()) {
      alert('กรุณาระบุเจ้าหน้าที่ IT ที่ดำเนินการจัดทำ');
      return;
    }
    try {
      setQuickAccepting(true);
      const targetReq = requests.find(r => r.id === id);
      const notes = targetReq?.adminNotes || 'กำลังดำเนินการจัดทำรายงาน';
      await onUpdateStatus(id, 'processing', notes, selectedOperatorForAccept.trim());
      setAcceptingId(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'ไม่สามารถรับเรื่องได้');
    } finally {
      setQuickAccepting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('คุณต้องการลบคำขอรายงานนี้ใช่หรือไม่? การดำเนินการนี้ไม่สามารถย้อนกลับได้')) {
      try {
        await onDeleteRequest(id);
      } catch (err) {
        alert(err instanceof Error ? err.message : 'ไม่สามารถลบคำขอได้');
      }
    }
  };

  return (
    <div id="request-list-section" className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
      
      {/* 1. Filter Controls & Search */}
      <div className="p-6 border-b border-slate-200 dark:border-slate-800 space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Main Tabs */}
          <div className="flex bg-slate-100 dark:bg-slate-950 p-1.5 rounded-2xl self-start">
            <button
              onClick={() => setActiveTab('all')}
              className={`text-sm px-5 py-2.5 rounded-xl font-bold transition-all cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-white dark:bg-slate-900 shadow-md text-blue-600 dark:text-blue-400 font-extrabold'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              คำขอทั้งหมดในแผนก
            </button>
            <button
              disabled={!user}
              onClick={() => setActiveTab('my')}
              className={`text-sm px-5 py-2.5 rounded-xl font-bold transition-all cursor-pointer ${
                !user ? 'opacity-50 cursor-not-allowed' : ''
              } ${
                activeTab === 'my'
                  ? 'bg-white dark:bg-slate-900 shadow-md text-blue-600 dark:text-blue-400 font-extrabold'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
              }`}
            >
              เฉพาะของฉัน
            </button>
          </div>

          {/* Search & Export Controls */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 sm:flex-initial">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <Search className="h-4.5 w-4.5 text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="ค้นหาตามชื่อ ผู้ขอ วัตถุประสงค์ หรือประเภท..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2.5 w-full sm:w-72 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sm font-medium rounded-xl outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 dark:text-slate-200"
              />
            </div>

            {/* Export Button */}
            <button
              onClick={handleExportToExcel}
              className="flex items-center justify-center gap-2 px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl shadow-md transition-all shrink-0 active:scale-95 cursor-pointer"
              title="ส่งออกข้อมูลเป็น Excel (.csv)"
            >
              <FileSpreadsheet className="h-5 w-5" />
              <span>ส่งออก Excel</span>
            </button>
          </div>
        </div>

        {/* 2. Sub-status filters */}
        <div className="flex flex-wrap items-center gap-2.5 pt-1">
          <span className="text-sm text-slate-700 dark:text-slate-300 font-extrabold mr-1">คัดกรองสถานะ:</span>
          <button
            onClick={() => setStatusFilter('all')}
            className={`text-sm px-4 py-2 rounded-full transition-all font-bold cursor-pointer ${
              statusFilter === 'all'
                ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 font-extrabold shadow-sm'
                : 'bg-slate-50 text-slate-600 hover:bg-slate-100 dark:bg-slate-950 dark:text-slate-400 border border-slate-200 dark:border-slate-800'
            }`}
          >
            ทั้งหมด ({requests.length})
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`text-sm px-4 py-2 rounded-full transition-all flex items-center space-x-1.5 font-bold cursor-pointer ${
              statusFilter === 'pending'
                ? 'bg-orange-100 text-orange-900 dark:bg-orange-950/40 dark:text-orange-400 border border-orange-300 dark:border-orange-800 font-extrabold shadow-sm'
                : 'bg-orange-50/50 text-orange-700 hover:bg-orange-100/50 dark:bg-slate-950 dark:text-orange-400/80 border border-orange-100 dark:border-orange-900/30'
            }`}
          >
            <Clock className="h-4 w-4 text-orange-500" />
            <span>รอรับเรื่อง ({requests.filter(r => r.status === 'pending').length})</span>
          </button>
          <button
            onClick={() => setStatusFilter('processing')}
            className={`text-sm px-4 py-2 rounded-full transition-all flex items-center space-x-1.5 font-bold cursor-pointer ${
              statusFilter === 'processing'
                ? 'bg-blue-100 text-blue-900 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-300 dark:border-blue-800 font-extrabold shadow-sm'
                : 'bg-blue-50/50 text-blue-700 hover:bg-blue-100/50 dark:bg-slate-950 dark:text-blue-400/80 border border-blue-100 dark:border-blue-900/30'
            }`}
          >
            <Clock className="h-4 w-4 text-blue-500" />
            <span>กำลังดำเนินการ ({requests.filter(r => r.status === 'processing').length})</span>
          </button>
          <button
            onClick={() => setStatusFilter('completed')}
            className={`text-xs px-3 py-1.5 rounded-full transition-all flex items-center space-x-1 ${
              statusFilter === 'completed'
                ? 'bg-green-100 text-green-800 dark:bg-green-950/30 dark:text-green-400 border border-green-200 dark:border-green-900 font-semibold'
                : 'bg-green-50/50 text-green-600 hover:bg-green-100/50 dark:bg-slate-950 dark:text-green-500/70'
            }`}
          >
            <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
            <span>สำเร็จแล้ว ({requests.filter(r => r.status === 'completed').length})</span>
          </button>
        </div>
      </div>

      {/* 3. Requests Feed */}
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {filteredRequests.length > 0 ? (
          filteredRequests.map((req) => {
            const isExpanded = expandedId === req.id;
            const isEditing = editingId === req.id;

            return (
              <div
                key={req.id}
                className={`transition-colors ${
                  isExpanded
                    ? 'bg-slate-50/50 dark:bg-slate-950/20'
                    : 'hover:bg-slate-50/30 dark:hover:bg-slate-950/5'
                }`}
              >
                {/* Header Summary Bar */}
                <div
                  onClick={() => toggleExpand(req.id)}
                  className="p-5 flex items-start justify-between cursor-pointer select-none"
                >
                  <div className="space-y-1.5 flex-1 min-w-0 pr-4">
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Status Badge */}
                      {req.status === 'completed' ? (
                        <span className="inline-flex items-center space-x-1 bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400 text-[10px] font-bold px-2 py-0.5 rounded-md border border-green-200 dark:border-green-900">
                          <CheckCircle2 className="h-3 w-3" />
                          <span>สำเร็จแล้ว</span>
                        </span>
                      ) : req.status === 'processing' ? (
                        <span className="inline-flex items-center space-x-1 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 text-[10px] font-bold px-2 py-0.5 rounded-md border border-blue-200 dark:border-blue-900">
                          <Clock className="h-3.5 w-3.5 text-blue-500" />
                          <span>กำลังดำเนินการ ({req.itOperator})</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center space-x-1 bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400 text-[10px] font-bold px-2 py-0.5 rounded-md border border-orange-200 dark:border-orange-900">
                          <Clock className="h-3.5 w-3.5 text-orange-500" />
                          <span>รอรับเรื่อง</span>
                        </span>
                      )}

                      {/* Department */}
                      <span className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-md font-mono">
                        {req.department.split(' (')[0] || req.department}
                      </span>

                      {/* Urgency Badge */}
                      {req.urgency === 'urgent' && (
                        <span className="inline-flex items-center space-x-1 bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 text-[10px] font-bold px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-900 animate-pulse">
                          <AlertCircle className="h-3 w-3 text-amber-500" />
                          <span>เร่งด่วน ({req.neededDate ? new Date(req.neededDate).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) : 'ไม่ระบุวัน'})</span>
                        </span>
                      )}
                    </div>

                    {/* Report Type */}
                    <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
                      {req.reportType}
                    </h4>

                    {/* Requester Identity */}
                    <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center">
                      <UserCheck className="h-3.5 w-3.5 text-slate-400 mr-1" />
                      {req.requesterName} <span className="mx-1 text-slate-300">•</span> <span className="font-mono text-[11px] text-blue-600 dark:text-blue-400 font-medium">{req.requesterPhone}</span>
                    </p>
                  </div>

                  {/* Right hand metadata */}
                  <div className="flex items-center space-x-3">
                    {/* Quick Accept Action for Admin */}
                    {req.status === 'pending' && user && (
                      <div 
                        onClick={(e) => e.stopPropagation()} 
                        className="flex items-center space-x-1.5 shrink-0"
                      >
                        {acceptingId === req.id ? (
                          <div className="flex items-center space-x-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700">
                            <select
                              value={selectedOperatorForAccept}
                              onChange={(e) => setSelectedOperatorForAccept(e.target.value)}
                              className="bg-white dark:bg-slate-900 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded px-1.5 py-1 text-[11px] outline-none font-semibold text-blue-600 dark:text-blue-400"
                            >
                              <option value="">-- ใครรับเรื่อง? --</option>
                              {IT_OPERATORS.map((it) => (
                                <option key={it} value={it}>
                                  {it}
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={() => handleConfirmQuickAccept(req.id)}
                              disabled={quickAccepting}
                              className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold px-2 py-1 rounded transition-all"
                            >
                              {quickAccepting ? '...' : 'ตกลง'}
                            </button>
                            <button
                              onClick={() => setAcceptingId(null)}
                              className="bg-slate-300 hover:bg-slate-400 text-slate-700 text-[10px] px-1.5 py-1 rounded dark:bg-slate-700 dark:text-slate-300 transition-all"
                            >
                              ยกเลิก
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartQuickAccept(req);
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold px-2.5 py-1.5 rounded-lg transition-all shadow-sm flex items-center space-x-1 shrink-0"
                          >
                            <CheckSquare className="h-3.5 w-3.5" />
                            <span>รับเรื่อง</span>
                          </button>
                        )}
                      </div>
                    )}

                    <div className="text-right hidden sm:block">
                      <p className="text-[10px] text-slate-400 font-mono flex items-center justify-end">
                        <Calendar className="h-3 w-3 mr-1" />
                        {new Date(req.requestDate).toLocaleDateString('th-TH', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric',
                        })}
                      </p>
                    </div>

                    {/* Expand/Collapse arrow */}
                    <div className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                      {isExpanded ? <ChevronUp className="h-5 w-5" /> : <ChevronDown className="h-5 w-5" />}
                    </div>
                  </div>
                </div>

                {/* Expanded Details Section */}
                {isExpanded && (
                  <div className="px-5 pb-5 pt-1 border-t border-dashed border-slate-100 dark:border-slate-800/80 animate-fade-in text-xs space-y-4">
                    
                    {/* 1. Purpose & Details */}
                    <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-100 dark:border-slate-900 space-y-4">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">
                          วัตถุประสงค์การใช้งานข้อมูล
                        </span>
                        <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                          {req.purpose}
                        </p>
                      </div>

                      {req.detailedDescription && (
                        <div className="pt-3 border-t border-slate-200/50 dark:border-slate-800/50">
                          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1">
                            รายละเอียดของข้อมูลที่ต้องการเพิ่มเติม
                          </span>
                          <p className="text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap font-medium">
                            {req.detailedDescription}
                          </p>
                        </div>
                      )}

                      {req.sampleFileName && (
                        <div className="pt-3 border-t border-slate-200/50 dark:border-slate-800/50">
                          <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider block mb-1.5">
                            ไฟล์ตัวอย่างแนบ
                          </span>
                          <div className="inline-flex items-center space-x-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-2.5 rounded-lg">
                            <File className="h-4 w-4 text-blue-500" />
                            <span className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate max-w-[150px] sm:max-w-xs">
                              {req.sampleFileName}
                            </span>
                            {req.sampleFileData && (
                              <a
                                href={req.sampleFileData}
                                download={req.sampleFileName}
                                className="flex items-center space-x-1 px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 dark:bg-blue-950/40 dark:hover:bg-blue-900/60 dark:text-blue-400 text-[11px] font-bold rounded transition-all cursor-pointer"
                              >
                                <Download className="h-3.5 w-3.5" />
                                <span>ดาวน์โหลด</span>
                              </a>
                            )}
                          </div>
                        </div>
                      )}

                      {req.urgency === 'urgent' && (
                        <div className="pt-3 border-t border-slate-200/50 dark:border-slate-800/50 space-y-2">
                          <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider block">
                            ความจำเป็นเร่งด่วน
                          </span>
                          <div className="flex items-center space-x-2 text-slate-800 dark:text-slate-200 font-medium">
                            <span className="inline-block bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-400 px-1.5 py-0.5 rounded text-[10px] font-bold">
                              เร่งด่วน
                            </span>
                            <span>ต้องการได้รับข้อมูลภายใน: {req.neededDate ? new Date(req.neededDate).toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' }) : 'ไม่ระบุวัน'}</span>
                          </div>
                          {req.urgencyReason ? (
                            <div className="bg-amber-50/50 dark:bg-amber-950/20 p-2.5 rounded-lg border border-amber-200/30 dark:border-amber-900/30 text-slate-700 dark:text-slate-300 italic">
                              "{req.urgencyReason}"
                            </div>
                          ) : (
                            <p className="text-slate-400 italic">ไม่ได้ระบุเหตุผลความเร่งด่วน</p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* 2. Admin Follow Up / Report Status details */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Dates / System audit */}
                      <div className="space-y-1.5 text-slate-500">
                        <p>
                          <strong className="text-slate-600 dark:text-slate-400 font-semibold">วันยื่นส่งคำขอ:</strong>{' '}
                          {new Date(req.requestDate).toLocaleString('th-TH')}
                        </p>
                        {req.completedDate && (
                          <p className="text-green-600 dark:text-green-400 font-semibold">
                            <strong>วันที่ดำเนินการสำเร็จ:</strong>{' '}
                            {new Date(req.completedDate).toLocaleString('th-TH')}
                          </p>
                        )}
                        {req.itOperator && (
                          <p className="text-blue-600 dark:text-blue-400 font-semibold flex items-center">
                            <span className="bg-blue-100 dark:bg-blue-950/60 text-blue-800 dark:text-blue-400 text-[10px] px-1.5 py-0.5 rounded mr-1.5 font-bold">IT OPERATOR</span>
                            <span>{req.itOperator}</span>
                          </p>
                        )}
                        <p className="text-[10px] font-mono text-slate-400">
                          ID: {req.id}
                        </p>
                      </div>

                      {/* Admin Notes Box */}
                      <div className="bg-slate-50/50 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 p-4 rounded-xl">
                        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider block mb-1 flex items-center">
                          <MessageSquare className="h-3.5 w-3.5 mr-1" />
                          บันทึกติดตามงานจากเจ้าหน้าที่สุขภาพดิจิทัล
                        </span>
                        {req.adminNotes ? (
                          <p className="text-slate-700 dark:text-slate-300 italic">
                            "{req.adminNotes}"
                          </p>
                        ) : (
                          <p className="text-slate-400 italic">ยังไม่มีข้อความตอบรับติดตามงาน</p>
                        )}
                      </div>
                    </div>

                    {/* 3. Action Bars (Update & Delete) */}
                    {user && (
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                        <div className="flex items-center space-x-2 flex-1 w-full">
                          {!isEditing ? (
                            <div className="flex flex-wrap items-center gap-2">
                              {req.status === 'processing' && (
                                <button
                                  onClick={() => startEditing(req)}
                                  className="text-xs bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-1.5 rounded-lg flex items-center space-x-1 font-semibold transition-all shadow-sm"
                                >
                                  <Edit3 className="h-3.5 w-3.5" />
                                  <span>อัปเดตสถานะและบันทึกติดตามงาน</span>
                                </button>
                              )}
                            </div>
                          ) : (
                            <div className="flex flex-col gap-2 bg-slate-100 dark:bg-slate-950 p-3 rounded-xl border border-slate-200 dark:border-slate-800 w-full">
                              <div className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/60 rounded-lg px-3 py-1.5 flex items-center space-x-1">
                                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                                <span>ปรับปรุงสถานะการจัดทำข้อมูล ผู้ดูแลรับผิดชอบ และบันทึกติดตามงาน</span>
                              </div>
                              <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full">
                                <div className="flex flex-wrap items-center gap-2">
                                  <select
                                    value={statusInput}
                                    onChange={(e) => setStatusInput(e.target.value as 'pending' | 'processing' | 'completed')}
                                    className="bg-white dark:bg-slate-900 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded px-2 py-1.5 text-xs outline-none font-semibold cursor-pointer"
                                  >
                                    <option value="pending">รอรับเรื่อง</option>
                                    <option value="processing">กำลังดำเนินการ (รับเรื่องแล้ว)</option>
                                    <option value="completed">สำเร็จแล้ว</option>
                                  </select>
                                  <select
                                    value={itOperatorInput}
                                    onChange={(e) => setItOperatorInput(e.target.value)}
                                    className="bg-white dark:bg-slate-900 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded px-2 py-1.5 text-xs outline-none w-44 font-semibold text-blue-600 dark:text-blue-400"
                                  >
                                    <option value="">-- เลือกเจ้าหน้าที่ IT --</option>
                                    {IT_OPERATORS.map((it) => (
                                      <option key={it} value={it}>
                                        {it}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <input
                                  type="text"
                                  placeholder="เขียนบันทึกการตอบกลับ..."
                                  value={adminNotesInput}
                                  onChange={(e) => setAdminNotesInput(e.target.value)}
                                  className="bg-white dark:bg-slate-900 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded px-2 py-1.5 text-xs outline-none flex-grow min-w-[200px]"
                                />
                                <div className="flex items-center space-x-2 shrink-0">
                                  <button
                                    onClick={() => handleSaveUpdate(req.id)}
                                    disabled={updating}
                                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-1.5 rounded text-xs transition-all"
                                  >
                                    {updating ? 'กำลังบันทึก...' : 'บันทึกอัปเดต'}
                                  </button>
                                  <button
                                    onClick={() => setEditingId(null)}
                                    className="bg-slate-300 hover:bg-slate-400 text-slate-700 px-2.5 py-1.5 rounded text-xs transition-all dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                                  >
                                    ยกเลิก
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Delete capability */}
                        <button
                          onClick={() => handleDelete(req.id)}
                          className="text-xs text-rose-500 hover:text-white border border-rose-200 hover:bg-rose-500/80 px-2.5 py-1.5 rounded-lg flex items-center space-x-1 font-semibold transition-all"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          <span>ลบคำขอนี้</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        ) : (
          <div className="p-8 text-center text-slate-400 text-sm">
            ไม่พบประวัติรายการขอรายงานสุขภาพดิจิทัลตามเงื่อนไขที่เลือก
          </div>
        )}
      </div>
    </div>
  );
}
