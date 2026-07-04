import { useState, useEffect } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { collection, doc, onSnapshot, setDoc, updateDoc, deleteDoc, query, orderBy, writeBatch, serverTimestamp, getDocs } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './firebase';
import { ReportRequest } from './types';
import Header from './components/Header';
import ReportRequestForm from './components/ReportRequestForm';
import DashboardStats from './components/DashboardStats';
import RequestList from './components/RequestList';
import { Sparkles, Database, DatabaseBackup, Activity, Info, LogIn } from 'lucide-react';
import { signInWithGoogle } from './firebase';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loadingUser, setLoadingUser] = useState(true);
  const [requests, setRequests] = useState<ReportRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [activeView, setActiveView] = useState<'dashboard' | 'form' | 'list'>('dashboard');

  // 1. Subscribe to Auth changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoadingUser(false);
    });
    return unsubscribe;
  }, []);

  // 2. Real-time Subscription to Firestore requests
  useEffect(() => {
    if (loadingUser) return;

    // We can load requests even if not logged in (to display the dashboard statistics or instructions), 
    // but the Firestore rules require being signed in.
    // If user is not signed in, we clear the requests.
    if (!user) {
      setRequests([]);
      setLoadingRequests(false);
      return;
    }

    setLoadingRequests(true);
    const requestsRef = collection(db, 'requests');
    const q = query(requestsRef, orderBy('requestDate', 'desc'));

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const dataList: ReportRequest[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          
          // Safety conversions
          const createdAtStr = data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt;
          const updatedAtStr = data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : data.updatedAt;

          dataList.push({
            id: docSnap.id,
            requesterName: data.requesterName || '',
            requesterPhone: data.requesterPhone || data.requesterEmail || '',
            department: data.department || '',
            reportType: data.reportType || '',
            purpose: data.purpose || '',
            detailedDescription: data.detailedDescription || '',
            sampleFileName: data.sampleFileName || '',
            sampleFileData: data.sampleFileData || '',
            urgency: data.urgency || 'normal',
            neededDate: data.neededDate || undefined,
            urgencyReason: data.urgencyReason || undefined,
            status: data.status || 'pending',
            requestDate: data.requestDate || new Date().toISOString(),
            completedDate: data.completedDate || undefined,
            adminNotes: data.adminNotes || '',
            itOperator: data.itOperator || '',
            userId: data.userId || '',
            createdAt: createdAtStr,
            updatedAt: updatedAtStr,
          });
        });
        setRequests(dataList);
        setLoadingRequests(false);
      },
      (error) => {
        // Wrap and log Firebase Permission Denied error using the Section 3 helper
        handleFirestoreError(error, OperationType.LIST, 'requests');
        setLoadingRequests(false);
      }
    );

    return unsubscribe;
  }, [user, loadingUser]);

  // 3. Create a new request
  const handleCreateRequest = async (formData: {
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
  }) => {
    if (!user) throw new Error('คุณต้องเข้าสู่ระบบก่อนทำรายการ');

    const requestId = 'req_' + Math.random().toString(36).substring(2, 15);
    const requestsRef = collection(db, 'requests');
    const docRef = doc(requestsRef, requestId);

    const payload: any = {
      requesterName: formData.requesterName,
      requesterPhone: formData.requesterPhone,
      department: formData.department,
      reportType: formData.reportType,
      purpose: formData.purpose,
      detailedDescription: formData.detailedDescription || '',
      sampleFileName: formData.sampleFileName || '',
      sampleFileData: formData.sampleFileData || '',
      urgency: formData.urgency || 'normal',
      status: 'pending',
      requestDate: new Date().toISOString(),
      userId: user.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    if (formData.urgency === 'urgent') {
      if (formData.neededDate) {
        payload.neededDate = formData.neededDate;
      }
      if (formData.urgencyReason) {
        payload.urgencyReason = formData.urgencyReason;
      }
    }

    try {
      await setDoc(docRef, payload);
      // Switch view to list so they can see their newly created request
      setActiveView('list');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `requests/${requestId}`);
    }
  };

  // 4. Update request status or adminNotes (Internal tracking update)
  const handleUpdateStatus = async (id: string, status: 'pending' | 'processing' | 'completed', adminNotes: string, itOperator: string) => {
    if (!user) throw new Error('คุณต้องเข้าสู่ระบบก่อนอัปเดตสถานะ');

    const docRef = doc(db, 'requests', id);
    const updates: any = {
      status,
      adminNotes,
      itOperator,
      updatedAt: serverTimestamp(),
    };

    if (status === 'completed') {
      updates.completedDate = new Date().toISOString();
    } else {
      updates.completedDate = null;
    }

    try {
      await updateDoc(docRef, updates);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `requests/${id}`);
    }
  };

  // 5. Delete Request
  const handleDeleteRequest = async (id: string) => {
    if (!user) throw new Error('คุณต้องเข้าสู่ระบบก่อนทำการลบ');

    const docRef = doc(db, 'requests', id);
    try {
      await deleteDoc(docRef);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `requests/${id}`);
    }
  };

  // 6. Database Seeding function to populate mock data
  const handleSeedMockData = async () => {
    if (!user) {
      alert('กรุณาลงชื่อเข้าสู่ระบบก่อนกดปุ่มนำเข้าข้อมูลจำลอง');
      return;
    }
    const seedTemplates = [
      {
        requesterName: 'แพทย์หญิงปิยนุช อรุณรัตน์',
        requesterPhone: '081-456-7890',
        department: 'แผนกผู้ป่วยนอก',
        reportType: 'เว็บแอพพลิเคชั่น',
        purpose: 'เพื่อใช้วิเคราะห์จำนวนผู้ป่วยนอกในจังหวัดห่างไกลที่ได้รับบริการการรักษาทางไกลในช่วงไตรมาสแรกของปี และวางแผนงบประมาณอุปกรณ์การแพทย์ทางไกลประจำปีถัดไป',
        status: 'completed' as const,
        urgency: 'normal' as const,
        monthOffset: -3,
      },
      {
        requesterName: 'ดร.สมเกียรติ มั่นคง',
        requesterPhone: '089-123-4567',
        department: 'งานธุรการ',
        reportType: 'รายงานในระบบ Hosxp',
        purpose: 'ต้องการดึงข้อมูลพฤติกรรมการระบาดของไข้หวัดใหญ่สายพันธุ์ใหม่เพื่อทำโมเดลพยากรณ์ล่วงหน้าสำหรับการเตรียมวัคซีนส่งไปยังโรงพยาบาลส่งเสริมสุขภาพตำบล',
        status: 'completed' as const,
        urgency: 'normal' as const,
        monthOffset: -2,
      },
      {
        requesterName: 'นายพงษ์ศักดิ์ รุ่งโรจน์',
        requesterPhone: '082-999-8888',
        department: 'แผนกอายุรกรรม',
        reportType: 'Excel',
        purpose: 'ใช้ประเมินสัดส่วนการครองเตียงของผู้ป่วยในเขตสุขภาพเพื่อการบริหารจัดการจัดสรรทรัพยากรยาและเวชภัณฑ์อย่างมีประสิทธิภาพ',
        status: 'pending' as const,
        urgency: 'normal' as const,
        monthOffset: -1,
      },
      {
        requesterName: 'นายสุรศักดิ์ วงศ์สุวรรณ',
        requesterPhone: '085-777-6666',
        department: 'ห้องเวชระเบียน',
        reportType: 'DashBroad BI',
        purpose: 'เพื่อตรวจสอบมาตรฐานการเชื่อมต่อ API ข้อมูลคนไข้ของแอปพลิเคชันหน่วยงานภายนอกที่ขอใช้ข้อมูล เพื่อคุ้มครองข้อมูลส่วนบุคคลของคนไข้ตามนโยบาย PDPA สุขภาพ',
        status: 'completed' as const,
        urgency: 'normal' as const,
        monthOffset: 0,
      },
      {
        requesterName: 'รศ.ดร. นเรศ ศิริวัฒนา',
        requesterPhone: '086-444-5555',
        department: 'แผนก ICU',
        reportType: 'อื่น ๆ',
        purpose: 'ขอข้อมูลสถิติเชิงลึกของผู้ป่วยติดเชื้อทางเดินหายใจส่วนบนจำแนกตามพิกัดตําบลและอายุ เพื่อทำวิจัยความสัมพันธ์ระหว่างปริมาณฝุ่นละอองขนาดเล็ก PM2.5 กับโรคระบบทางเดินหายใจ',
        status: 'pending' as const,
        urgency: 'urgent' as const,
        neededDateOffset: 5,
        urgencyReason: 'ใช้เสนอต่อที่ประชุมสภาจริยธรรมวิจัยคณะแพทยศาสตร์วันพุธนี้',
        monthOffset: 0,
      },
      {
        requesterName: 'นางสาวณิชาภา ใจดี',
        requesterPhone: '083-222-1111',
        department: 'งานประกันสุขภาพ',
        reportType: 'DashBroad BI',
        purpose: 'ใช้เปรียบเทียบประสิทธิผลความคุ้มค่าของการลดเวลาเดินทางเฉลี่ย of คนไข้โรคเรื้อรัง (NCDs) ที่นัดหมายคุยผ่านทางระบบเทเลเมดิซีนเทียบกับการเดินมารักษาแบบเดิม',
        status: 'completed' as const,
        urgency: 'normal' as const,
        monthOffset: 0,
      }
    ];

    try {
      const batch = writeBatch(db);

      for (const item of seedTemplates) {
        const randId = 'req_seed_' + Math.random().toString(36).substring(2, 10);
        const ref = doc(db, 'requests', randId);
        
        // Calculate date
        const dateObj = new Date();
        dateObj.setMonth(dateObj.getMonth() + item.monthOffset);
        const isoDate = dateObj.toISOString();

        // Calculate neededDate if urgent
        let neededDateVal: string | undefined = undefined;
        if (item.urgency === 'urgent' && 'neededDateOffset' in item) {
          const neededDateObj = new Date();
          neededDateObj.setDate(neededDateObj.getDate() + (item as any).neededDateOffset);
          neededDateVal = neededDateObj.toISOString().split('T')[0];
        }

        const payload: any = {
          requesterName: item.requesterName,
          requesterPhone: item.requesterPhone,
          department: item.department,
          reportType: item.reportType,
          purpose: item.purpose,
          urgency: item.urgency || 'normal',
          status: item.status,
          requestDate: isoDate,
          completedDate: item.status === 'completed' ? isoDate : null,
          adminNotes: item.status === 'completed' ? 'ข้อมูลถูกจัดส่งผ่าน Secure Mail เรียบร้อยแล้ว' : '',
          userId: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        };

        if (item.urgency === 'urgent') {
          if (neededDateVal) {
            payload.neededDate = neededDateVal;
          }
          if ('urgencyReason' in item) {
            payload.urgencyReason = item.urgencyReason;
          }
        }

        batch.set(ref, payload);
      }

      await batch.commit();
      alert('นำเข้าข้อมูลวิเคราะห์จำลองสำเร็จจำนวน 6 รายการเรียบร้อยแล้ว!');
    } catch (err) {
      alert('ไม่สามารถนำเข้าข้อมูลจำลองได้: ' + (err instanceof Error ? err.message : String(err)));
    }
  };

  return (
    <div id="app-root-container" className="h-screen w-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex font-sans overflow-hidden transition-colors duration-200">
      
      {/* 1. Sidebar Navigation (Visible on Desktop) */}
      <aside className="w-64 bg-slate-900 text-slate-400 flex flex-col border-r border-slate-800 shrink-0 hidden md:flex h-full">
        {/* Brand/Logo Header */}
        <div className="p-6 border-b border-slate-800/60">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shrink-0 shadow-sm">
              <Activity className="h-5 w-5" />
            </div>
            <span className="text-blue-400 font-extrabold text-lg tracking-tight">กลุ่มงานสุขภาพดิจิทัล</span>
          </div>
        </div>

        {/* Sidebar Nav Links */}
        <nav className="flex-1 px-4 space-y-1 mt-6">
          <button
            onClick={() => setActiveView('dashboard')}
            className={`w-full flex items-center space-x-3 p-3 rounded-lg text-left transition-all ${
              activeView === 'dashboard'
                ? 'bg-blue-600 text-white font-semibold shadow-sm'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"></path></svg>
            <span className="text-sm font-medium">แดชบอร์ด</span>
          </button>
          <button
            onClick={() => setActiveView('list')}
            className={`w-full flex items-center space-x-3 p-3 rounded-lg text-left transition-all ${
              activeView === 'list'
                ? 'bg-blue-600 text-white font-semibold shadow-sm'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
            <span className="text-sm font-medium">รายงานทั้งหมด ({requests.length})</span>
          </button>
          <button
            onClick={() => setActiveView('form')}
            className={`w-full flex items-center space-x-3 p-3 rounded-lg text-left transition-all ${
              activeView === 'form'
                ? 'bg-blue-600 text-white font-semibold shadow-sm'
                : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
            <span className="text-sm font-medium">ยื่นฟอร์มขอข้อมูล</span>
          </button>
        </nav>

        {/* User admin footer block */}
        <div className="p-4 border-t border-slate-800/60 mt-auto">
          {user ? (
            <div className="flex items-center space-x-3 p-2.5 bg-slate-800 rounded-lg border border-slate-700/40">
              {user.photoURL ? (
                <img src={user.photoURL} alt={user.displayName || ''} className="w-8 h-8 rounded-full border border-slate-600" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-slate-600 flex items-center justify-center text-white text-xs font-mono font-bold">
                  {(user.displayName || user.email || 'A')[0].toUpperCase()}
                </div>
              )}
              <div className="flex-1 overflow-hidden">
                <p className="text-xs text-white font-medium truncate">{user.displayName || 'User'}</p>
                <p className="text-[9px] text-slate-400 truncate">{user.email}</p>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-500 text-center py-2">
              ไม่ได้เข้าสู่ระบบ
            </div>
          )}
        </div>
      </aside>

      {/* 2. Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Dynamic header containing Title & user controls */}
        <Header user={user} loading={loadingUser} activeView={activeView} setActiveView={setActiveView} requestsCount={requests.length} />

        {/* Scrollable page area */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 space-y-6 bg-slate-50 dark:bg-slate-950">
          
          {/* Banner with App Intro */}
          <div id="brand-welcome-banner" className="bg-blue-600 rounded-2xl p-6 sm:p-10 text-white shadow-xl relative overflow-hidden border border-blue-500">
            <div className="absolute right-0 bottom-0 top-0 opacity-15 flex items-center justify-center pr-10">
              <Activity className="h-48 w-48 text-white animate-pulse" />
            </div>
            
            <div className="relative z-10 max-w-4xl space-y-4">
              <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight text-white leading-tight filter drop-shadow-sm flex flex-col gap-1 sm:gap-2">
                <span>ระบบรับเรื่องและติดตามการขอรายงานข้อมูล</span>
                <span className="text-xl sm:text-3xl font-bold opacity-95">กลุ่มงานสุขภาพดิจิทัล</span>
              </h1>
              <p className="text-sm sm:text-base text-blue-50 dark:text-indigo-100 font-medium max-w-none leading-relaxed">
                ระบบจัดการคำร้องขอรายงานข้อมูล ติดตามสถานะ การดำเนินการ และแสดงแดชบอร์ดสรุปสถิติจำนวนคำขอ ของหน่วยงาน
              </p>
            </div>
          </div>

          {/* 3. Action Navigation Tabs (Visible ONLY on Mobile/Tablet where sidebar is hidden) */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 md:hidden pb-1">
            <button
              onClick={() => setActiveView('dashboard')}
              className={`pb-3 text-xs sm:text-sm font-semibold tracking-wide border-b-2 transition-all mr-4 sm:mr-6 ${
                activeView === 'dashboard'
                  ? 'border-blue-600 text-slate-900 dark:text-white'
                  : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              แดชบอร์ด
            </button>
            <button
              onClick={() => setActiveView('list')}
              className={`pb-3 text-xs sm:text-sm font-semibold tracking-wide border-b-2 transition-all mr-4 sm:mr-6 ${
                activeView === 'list'
                  ? 'border-blue-600 text-slate-900 dark:text-white'
                  : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              รายการขอรายงาน ({requests.length})
            </button>
            <button
              onClick={() => setActiveView('form')}
              className={`pb-3 text-xs sm:text-sm font-semibold tracking-wide border-b-2 transition-all ${
                activeView === 'form'
                  ? 'border-blue-600 text-slate-900 dark:text-white'
                  : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              ยื่นฟอร์มขอข้อมูล
            </button>
          </div>

          {/* 4. Main Views Routing */}
          <div id="main-content-stage" className="pb-12">
            {loadingUser ? (
              <div className="py-20 flex flex-col items-center justify-center space-y-3">
                <div className="h-10 w-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-xs text-slate-500 font-mono">กำลังตรวจสอบความถูกต้องของสิทธิ์การเข้าถึง...</p>
              </div>
            ) : !user ? (
              <div className="py-12 text-center max-w-xl mx-auto space-y-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 sm:p-10 rounded-2xl shadow-lg">
                {/* Simple Digital Report & Analytics Image */}
                <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800 bg-[#0d1425] p-8 max-w-sm mx-auto flex items-center justify-center shadow-inner">
                  <div className="w-24 h-24 bg-[#1e70e5] rounded-[22px] flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                    <Activity className="h-14 w-14 stroke-[2.5]" />
                  </div>
                </div>

                <div>
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white font-sans tracking-tight">
                    ระบบรายงานข้อมูลสุขภาพดิจิทัล
                  </h2>
                </div>

                <button
                  onClick={signInWithGoogle}
                  className="w-full flex items-center justify-center space-x-3 bg-blue-600 hover:bg-blue-700 text-white font-black text-base py-4 px-6 rounded-2xl shadow-md hover:shadow-lg transition-all transform active:scale-[0.98] cursor-pointer"
                >
                  <LogIn className="h-6 w-6" />
                  <span>ลงชื่อเข้าสู่ระบบด้วย Google Account</span>
                </button>
              </div>
            ) : (
              <div className="animate-fade-in">
                {activeView === 'dashboard' && (
                  <div className="space-y-6">
                    {loadingRequests ? (
                      <div className="py-16 flex flex-col items-center justify-center space-y-3">
                        <div className="h-8 w-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-xs text-slate-400">กำลังประมวลผลข้อมูลสถิติ...</p>
                      </div>
                    ) : (
                      <>
                        {requests.length === 0 && (
                          <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-400 p-5 rounded-xl flex items-start space-x-3 mb-4 text-xs">
                            <Info className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                            <div className="space-y-1">
                              <p className="font-semibold">ระบบยังไม่มีประวัติคำขอรายงานข้อมูลสุขภาพ</p>
                              <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                                เพื่อความง่ายในการตรวจสอบ แนะนำให้คลิกปุ่ม <strong>"เพิ่มข้อมูลตัวอย่างวิเคราะห์ (Seed Mock Data)"</strong> ในแบนเนอร์ส่วนต้อนรับด้านบนเพื่อสร้างสถิติจำลองทันที หรือกดปุ่ม <strong>"ยื่นฟอร์มขอข้อมูลใหม่"</strong> เพื่อกรอกทีละรายการ
                              </p>
                            </div>
                          </div>
                        )}
                        <DashboardStats requests={requests} />
                      </>
                    )}
                  </div>
                )}

                {activeView === 'form' && (
                  <div className="max-w-2xl mx-auto">
                    <ReportRequestForm user={user} onSubmit={handleCreateRequest} />
                  </div>
                )}

                {activeView === 'list' && (
                  <div>
                    {loadingRequests ? (
                      <div className="py-16 flex flex-col items-center justify-center space-y-3">
                        <div className="h-8 w-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        <p className="text-xs text-slate-400">กำลังเชื่อมต่อคลังข้อมูล...</p>
                      </div>
                    ) : (
                      <RequestList
                        requests={requests}
                        user={user}
                        onUpdateStatus={handleUpdateStatus}
                        onDeleteRequest={handleDeleteRequest}
                      />
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
