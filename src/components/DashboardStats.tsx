import { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { ReportRequest, IT_OPERATORS } from '../types';
import { BarChart3, PieChart as PieIcon, LineChart, Users, Calendar, CheckCircle2, Clock, FileSpreadsheet, Search, Wrench, FolderOpen, ChevronDown, ChevronRight, Layers } from 'lucide-react';

interface DashboardStatsProps {
  requests: ReportRequest[];
}

export default function DashboardStats({ requests }: DashboardStatsProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [individualViewMode, setIndividualViewMode] = useState<'grouped' | 'flat'>('grouped');
  const [expandedDepts, setExpandedDepts] = useState<{ [key: string]: boolean }>({});

  const toggleDept = (deptName: string) => {
    setExpandedDepts(prev => ({
      ...prev,
      [deptName]: prev[deptName] === false ? true : false // default is true (expanded) if undefined
    }));
  };

  // 1. Core KPIs
  const kpis = useMemo(() => {
    const total = requests.length;
    const completed = requests.filter(r => r.status === 'completed').length;
    const processing = requests.filter(r => r.status === 'processing').length;
    const pending = requests.filter(r => r.status === 'pending').length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    return { total, completed, processing, pending, completionRate };
  }, [requests]);

  // 2. Department Breakdown Data for Bar Chart
  const departmentData = useMemo(() => {
    const counts: { [key: string]: { total: number; completed: number; processing: number; pending: number } } = {};
    
    requests.forEach(r => {
      // Clean name for display if long
      let name = r.department.split(' (')[0] || r.department;
      if (!counts[name]) {
        counts[name] = { total: 0, completed: 0, processing: 0, pending: 0 };
      }
      counts[name].total += 1;
      if (r.status === 'completed') {
        counts[name].completed += 1;
      } else if (r.status === 'processing') {
        counts[name].processing += 1;
      } else {
        counts[name].pending += 1;
      }
    });

    return Object.entries(counts).map(([name, data]) => ({
      name,
      'สำเร็จแล้ว': data.completed,
      'กำลังดำเนินการ': data.processing,
      'รอรับเรื่อง': data.pending,
      'รวมทั้งหมด': data.total,
    })).sort((a, b) => b['รวมทั้งหมด'] - a['รวมทั้งหมด']);
  }, [requests]);

  // 3. Status Data for Pie Chart
  const statusData = useMemo(() => {
    return [
      { name: 'กำลังดำเนินการ', value: kpis.processing, color: '#3b82f6' }, // Blue-500
      { name: 'รอรับเรื่อง', value: kpis.pending, color: '#f97316' }, // Orange-500
      { name: 'สำเร็จแล้ว', value: kpis.completed, color: '#22c55e' }, // Green-500
    ].filter(item => item.value > 0);
  }, [kpis]);

  const [timeUnit, setTimeUnit] = useState<'daily' | 'monthly' | 'yearly'>('monthly');
  const [dateRangeType, setDateRangeType] = useState<'all' | '7days' | '30days' | 'thisYear' | 'custom'>('all');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // 4. Trend Analysis Data for Area Chart
  const trendData = useMemo(() => {
    // 1. Filter requests based on selected date range
    let filtered = [...requests];
    const now = new Date();
    
    if (dateRangeType === '7days') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(now.getDate() - 7);
      filtered = filtered.filter(r => {
        const d = new Date(r.requestDate);
        return !isNaN(d.getTime()) && d >= sevenDaysAgo;
      });
    } else if (dateRangeType === '30days') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(now.getDate() - 30);
      filtered = filtered.filter(r => {
        const d = new Date(r.requestDate);
        return !isNaN(d.getTime()) && d >= thirtyDaysAgo;
      });
    } else if (dateRangeType === 'thisYear') {
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      filtered = filtered.filter(r => {
        const d = new Date(r.requestDate);
        return !isNaN(d.getTime()) && d >= startOfYear;
      });
    } else if (dateRangeType === 'custom') {
      if (customStartDate) {
        const start = new Date(customStartDate);
        filtered = filtered.filter(r => {
          const d = new Date(r.requestDate);
          return !isNaN(d.getTime()) && d >= start;
        });
      }
      if (customEndDate) {
        const end = new Date(customEndDate);
        end.setHours(23, 59, 59, 999);
        filtered = filtered.filter(r => {
          const d = new Date(r.requestDate);
          return !isNaN(d.getTime()) && d <= end;
        });
      }
    }

    // 2. Aggregate based on timeUnit
    if (timeUnit === 'daily') {
      const dailyGroups: { [key: string]: { dateObj: Date; total: number; completed: number; pending: number } } = {};
      
      filtered.forEach(r => {
        const date = new Date(r.requestDate);
        if (isNaN(date.getTime())) return;
        
        const dayKey = date.toISOString().split('T')[0];
        if (!dailyGroups[dayKey]) {
          dailyGroups[dayKey] = {
            dateObj: new Date(dayKey),
            total: 0,
            completed: 0,
            pending: 0
          };
        }
        dailyGroups[dayKey].total += 1;
        if (r.status === 'completed') {
          dailyGroups[dayKey].completed += 1;
        } else {
          dailyGroups[dayKey].pending += 1;
        }
      });

      return Object.entries(dailyGroups)
        .sort((a, b) => a[1].dateObj.getTime() - b[1].dateObj.getTime())
        .map(([key, data]) => {
          const label = data.dateObj.toLocaleDateString('th-TH', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
          });
          return {
            name: label,
            'ยอดคำขอ': data.total,
            'สำเร็จแล้ว': data.completed,
            'รอดำเนินการ': data.pending,
          };
        });

    } else if (timeUnit === 'yearly') {
      const yearlyGroups: { [key: string]: { yearNum: number; total: number; completed: number; pending: number } } = {};
      
      filtered.forEach(r => {
        const date = new Date(r.requestDate);
        if (isNaN(date.getTime())) return;
        
        const year = date.getFullYear();
        const yearKey = String(year);
        if (!yearlyGroups[yearKey]) {
          yearlyGroups[yearKey] = {
            yearNum: year,
            total: 0,
            completed: 0,
            pending: 0
          };
        }
        yearlyGroups[yearKey].total += 1;
        if (r.status === 'completed') {
          yearlyGroups[yearKey].completed += 1;
        } else {
          yearlyGroups[yearKey].pending += 1;
        }
      });

      return Object.entries(yearlyGroups)
        .sort((a, b) => a[1].yearNum - b[1].yearNum)
        .map(([key, data]) => {
          const thaiYear = data.yearNum + 543;
          return {
            name: `ปี ${thaiYear}`,
            'ยอดคำขอ': data.total,
            'สำเร็จแล้ว': data.completed,
            'รอดำเนินการ': data.pending,
          };
        });

    } else {
      // monthly
      const monthlyGroups: { [key: string]: { sortKey: string; total: number; completed: number; pending: number } } = {};
      
      filtered.forEach(r => {
        const date = new Date(r.requestDate);
        if (isNaN(date.getTime())) return;
        
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const sortKey = `${year}-${month}`;
        
        const label = date.toLocaleDateString('th-TH', { year: 'numeric', month: 'short' });
        if (!monthlyGroups[label]) {
          monthlyGroups[label] = { sortKey, total: 0, completed: 0, pending: 0 };
        }
        monthlyGroups[label].total += 1;
        if (r.status === 'completed') {
          monthlyGroups[label].completed += 1;
        } else {
          monthlyGroups[label].pending += 1;
        }
      });

      return Object.entries(monthlyGroups)
        .sort((a, b) => a[1].sortKey.localeCompare(b[1].sortKey))
        .map(([label, data]) => ({
          name: label,
          'ยอดคำขอ': data.total,
          'สำเร็จแล้ว': data.completed,
          'รอดำเนินการ': data.pending,
        }));
    }
  }, [requests, timeUnit, dateRangeType, customStartDate, customEndDate]);

  // 5. Individual Summary Data (สรุปการขอรายงานรายบุคคล)
  const individualData = useMemo(() => {
    const people: { [key: string]: { name: string; phone: string; dept: string; total: number; completed: number; processing: number; pending: number; lastRequest: string } } = {};
    
    requests.forEach(r => {
      const key = `${r.requesterName.trim()}_${r.requesterPhone.trim()}`;
      if (!people[key]) {
        people[key] = {
          name: r.requesterName,
          phone: r.requesterPhone,
          dept: r.department,
          total: 0,
          completed: 0,
          processing: 0,
          pending: 0,
          lastRequest: r.requestDate,
        };
      }
      
      people[key].total += 1;
      if (r.status === 'completed') {
        people[key].completed += 1;
      } else if (r.status === 'processing') {
        people[key].processing += 1;
      } else {
        people[key].pending += 1;
      }
      
      // Keep track of latest request date
      if (new Date(r.requestDate) > new Date(people[key].lastRequest)) {
        people[key].lastRequest = r.requestDate;
      }
    });

    const list = Object.values(people);

    // Apply simple search filter
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      return list.filter(p => 
        p.name.toLowerCase().includes(term) || 
        p.phone.toLowerCase().includes(term) || 
        p.dept.toLowerCase().includes(term)
      );
    }

    return list;
  }, [requests, searchTerm]);

  // 5.5. Department Grouped Individuals Data (สรุปรายบุคคลจำแนกรายหน่วยงาน)
  const departmentGroupedData = useMemo(() => {
    const groups: {
      [dept: string]: {
        deptName: string;
        totalRequests: number;
        completedRequests: number;
        processingRequests: number;
        pendingRequests: number;
        people: {
          name: string;
          phone: string;
          total: number;
          completed: number;
          processing: number;
          pending: number;
          lastRequest: string;
        }[];
      }
    } = {};

    requests.forEach(r => {
      const deptName = r.department.trim() || 'ไม่ระบุหน่วยงาน';
      if (!groups[deptName]) {
        groups[deptName] = {
          deptName,
          totalRequests: 0,
          completedRequests: 0,
          processingRequests: 0,
          pendingRequests: 0,
          people: [],
        };
      }

      const group = groups[deptName];
      group.totalRequests += 1;
      if (r.status === 'completed') {
        group.completedRequests += 1;
      } else if (r.status === 'processing') {
        group.processingRequests += 1;
      } else {
        group.pendingRequests += 1;
      }

      let person = group.people.find(p => p.name === r.requesterName);
      if (!person) {
        person = {
          name: r.requesterName,
          phone: r.requesterPhone || '-',
          total: 0,
          completed: 0,
          processing: 0,
          pending: 0,
          lastRequest: r.requestDate,
        };
        group.people.push(person);
      }

      person.total += 1;
      if (r.status === 'completed') {
        person.completed += 1;
      } else if (r.status === 'processing') {
        person.processing += 1;
      } else {
        person.pending += 1;
      }

      if (new Date(r.requestDate) > new Date(person.lastRequest)) {
        person.lastRequest = r.requestDate;
      }
    });

    const list = Object.values(groups);

    // Filter based on search term
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      return list.map(group => {
        const deptMatches = group.deptName.toLowerCase().includes(term);
        const filteredPeople = group.people.filter(p => 
          p.name.toLowerCase().includes(term) || p.phone.toLowerCase().includes(term)
        );

        if (deptMatches) {
          return group;
        } else if (filteredPeople.length > 0) {
          return {
            ...group,
            people: filteredPeople,
          };
        }
        return null;
      }).filter(Boolean) as typeof list;
    }

    return list.sort((a, b) => b.totalRequests - a.totalRequests);
  }, [requests, searchTerm]);

  // 6. IT Operator Summary Data (สรุปผลงานตาม IT ที่ดำเนินการ)
  const itOperatorData = useMemo(() => {
    const operators: { [key: string]: { name: string; total: number; completed: number; pending: number; lastActive?: string } } = {};
    
    // Initialize with all predefined IT operators
    IT_OPERATORS.forEach(op => {
      operators[op] = {
        name: op,
        total: 0,
        completed: 0,
        pending: 0,
        lastActive: undefined,
      };
    });

    // Accumulate metrics from requests
    requests.forEach(r => {
      if (r.itOperator && r.itOperator.trim()) {
        const op = r.itOperator.trim();
        if (!operators[op]) {
          operators[op] = {
            name: op,
            total: 0,
            completed: 0,
            pending: 0,
            lastActive: undefined,
          };
        }
        operators[op].total += 1;
        if (r.status === 'completed') {
          operators[op].completed += 1;
        } else {
          operators[op].pending += 1;
        }
        // Last active date tracking
        if (!operators[op].lastActive || new Date(r.requestDate) > new Date(operators[op].lastActive!)) {
          operators[op].lastActive = r.requestDate;
        }
      }
    });

    return Object.values(operators).sort((a, b) => b.total - a.total);
  }, [requests]);

  return (
    <div id="stats-dashboard" className="space-y-8">
      {/* 1. KPIs Section */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-6">
        {/* KPI: Total */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md flex items-center space-x-4 transition-all hover:scale-[1.02] hover:shadow-lg">
          <div className="bg-blue-100 dark:bg-blue-950/60 p-4 rounded-2xl shrink-0">
            <FileSpreadsheet className="h-7 w-7 text-blue-600 dark:text-blue-400" />
          </div>
          <div className="min-w-0">
            <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-bold tracking-wide block">คำขอทั้งหมด</span>
            <p className="text-3xl sm:text-4xl font-black text-slate-950 dark:text-white font-mono mt-1 leading-none">{kpis.total}</p>
          </div>
        </div>

        {/* KPI: Pending */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md flex items-center space-x-4 transition-all hover:scale-[1.02] hover:shadow-lg">
          <div className="bg-orange-100 dark:bg-orange-950/60 p-4 rounded-2xl shrink-0">
            <Clock className="h-7 w-7 text-orange-600 dark:text-orange-400 animate-pulse" />
          </div>
          <div className="min-w-0">
            <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-bold tracking-wide block">รอรับเรื่อง</span>
            <p className="text-3xl sm:text-4xl font-black text-orange-600 dark:text-orange-400 font-mono mt-1 leading-none">{kpis.pending}</p>
          </div>
        </div>

        {/* KPI: Processing */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md flex items-center space-x-4 transition-all hover:scale-[1.02] hover:shadow-lg">
          <div className="bg-sky-100 dark:bg-sky-950/60 p-4 rounded-2xl shrink-0">
            <Clock className="h-7 w-7 text-sky-600 dark:text-sky-400" />
          </div>
          <div className="min-w-0">
            <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-bold tracking-wide block">กำลังดำเนินการ</span>
            <p className="text-3xl sm:text-4xl font-black text-blue-600 dark:text-blue-400 font-mono mt-1 leading-none">{kpis.processing}</p>
          </div>
        </div>

        {/* KPI: Completed */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md flex items-center space-x-4 transition-all hover:scale-[1.02] hover:shadow-lg">
          <div className="bg-green-100 dark:bg-green-950/60 p-4 rounded-2xl shrink-0">
            <CheckCircle2 className="h-7 w-7 text-green-600 dark:text-green-400" />
          </div>
          <div className="min-w-0">
            <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-bold tracking-wide block">ดำเนินการสำเร็จ</span>
            <p className="text-3xl sm:text-4xl font-black text-green-600 dark:text-green-400 font-mono mt-1 leading-none">{kpis.completed}</p>
          </div>
        </div>

        {/* KPI: Completion rate */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md flex items-center space-x-4 transition-all hover:scale-[1.02] hover:shadow-lg">
          <div className="bg-indigo-100 dark:bg-indigo-950/60 p-4 rounded-2xl shrink-0">
            <BarChart3 className="h-7 w-7 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="min-w-0">
            <span className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 font-bold tracking-wide block">อัตราความสำเร็จ</span>
            <p className="text-3xl sm:text-4xl font-black text-indigo-600 dark:text-indigo-400 font-mono mt-1 leading-none">{kpis.completionRate}%</p>
          </div>
        </div>
      </div>

      {/* 2. Charts Visualization Grid (แสดงเป็นกราฟวิเคราะห์ข้อมูล) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Chart A: Trend Summary (Area Chart) */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md lg:col-span-2 flex flex-col justify-between">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <div className="flex items-center space-x-2.5">
                <Calendar className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                  สรุปแนวโน้มการขอรายงานข้อมูล
                </h3>
              </div>
              
              {/* Time Unit Buttons */}
              <div className="flex bg-slate-100 dark:bg-slate-950 p-1 rounded-xl self-start sm:self-auto border border-slate-200/50 dark:border-slate-800/50">
                <button
                  type="button"
                  onClick={() => setTimeUnit('daily')}
                  className={`text-xs px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    timeUnit === 'daily'
                      ? 'bg-white dark:bg-slate-900 shadow-sm text-blue-600 dark:text-blue-400'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  รายวัน
                </button>
                <button
                  type="button"
                  onClick={() => setTimeUnit('monthly')}
                  className={`text-xs px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    timeUnit === 'monthly'
                      ? 'bg-white dark:bg-slate-900 shadow-sm text-blue-600 dark:text-blue-400'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  รายเดือน
                </button>
                <button
                  type="button"
                  onClick={() => setTimeUnit('yearly')}
                  className={`text-xs px-3.5 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    timeUnit === 'yearly'
                      ? 'bg-white dark:bg-slate-900 shadow-sm text-blue-600 dark:text-blue-400'
                      : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                  }`}
                >
                  รายปี
                </button>
              </div>
            </div>

            {/* Date Range Predefined/Custom Filter Selector */}
            <div className="bg-slate-50 dark:bg-slate-950/40 p-3.5 rounded-xl border border-slate-100 dark:border-slate-800/80 mb-5 space-y-2.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-xs text-slate-700 dark:text-slate-300 font-bold mr-1">กรองช่วงเวลา:</span>
                {[
                  { id: 'all', label: 'ทั้งหมด' },
                  { id: '7days', label: '7 วันล่าสุด' },
                  { id: '30days', label: '30 วันล่าสุด' },
                  { id: 'thisYear', label: 'ปีนี้' },
                  { id: 'custom', label: 'กำหนดช่วงวันที่...' }
                ].map(item => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setDateRangeType(item.id as any)}
                    className={`text-xs px-3 py-1.5 rounded-lg font-bold transition-all border cursor-pointer ${
                      dateRangeType === item.id
                        ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 hover:bg-slate-100 dark:text-slate-400'
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>

              {/* Custom Date Inputs */}
              {dateRangeType === 'custom' && (
                <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-slate-150 dark:border-slate-800/60 mt-1">
                  <div className="flex items-center space-x-1.5">
                    <span className="text-xs text-slate-500 font-medium">จาก:</span>
                    <input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      className="text-xs px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500"
                    />
                  </div>
                  <div className="flex items-center space-x-1.5">
                    <span className="text-xs text-slate-500 font-medium">ถึง:</span>
                    <input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      className="text-xs px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500"
                    />
                  </div>
                  {(customStartDate || customEndDate) && (
                    <button
                      type="button"
                      onClick={() => {
                        setCustomStartDate('');
                        setCustomEndDate('');
                      }}
                      className="text-xs font-bold text-red-500 hover:text-red-600 px-1 py-0.5 cursor-pointer ml-1"
                    >
                      ล้างค่าช่วงวันที่
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="h-64 mt-2">
            {trendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-800" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={11} />
                  <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                  <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '8px' }} />
                  <Legend wrapperStyle={{ fontSize: '11px', marginTop: '5px' }} />
                  <Area type="monotone" dataKey="ยอดคำขอ" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorTotal)" />
                  <Area type="monotone" dataKey="สำเร็จแล้ว" stroke="#22c55e" strokeWidth={1.5} fillOpacity={0} />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-xs text-slate-400 space-y-1">
                <span>ยังไม่มีข้อมูลเพียงพอในช่วงเวลาและโหมดที่เลือก</span>
                <span className="text-[10px] text-slate-500">(ลองเปลี่ยนช่วงเวลาการกรองหรือสร้างคำขอข้อมูลใหม่)</span>
              </div>
            )}
          </div>
        </div>

        {/* Chart B: Status Breakdown (Pie Chart) */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md">
          <div className="flex items-center space-x-2.5 mb-4">
            <PieIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">สัดส่วนสถานะงานดำเนินการ</h3>
          </div>
          <div className="h-64 flex flex-col justify-between">
            {statusData.length > 0 ? (
              <div className="relative h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ fontSize: '12px', borderRadius: '8px' }} />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center Percentage Display */}
                <div className="absolute inset-0 flex flex-col items-center justify-center mt-[-10px]">
                  <span className="text-2xl font-bold font-mono text-slate-800 dark:text-white">
                    {kpis.completionRate}%
                  </span>
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest font-semibold">สำเร็จ</span>
                </div>
              </div>
            ) : (
              <div className="h-48 flex items-center justify-center text-xs text-slate-400">
                ไม่มีข้อมูลคำขอรายงาน
              </div>
            )}
            
            <div className="flex justify-center space-x-4 text-xs text-slate-600 dark:text-slate-400 pb-2 flex-wrap gap-y-1.5">
              <div className="flex items-center space-x-1.5">
                <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                <span>รอรับเรื่อง ({kpis.pending})</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                <span>กำลังดำเนินการ ({kpis.processing})</span>
              </div>
              <div className="flex items-center space-x-1.5">
                <div className="w-3 h-3 rounded-full bg-green-500"></div>
                <span>สำเร็จ ({kpis.completed})</span>
              </div>
            </div>
          </div>
        </div>

        {/* Chart C: Requests by Department (Bar Chart) */}
        <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md lg:col-span-3">
          <div className="flex items-center space-x-2.5 mb-4">
            <BarChart3 className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">จำนวนการขอรายงานจำแนกตามหน่วยงาน</h3>
          </div>
          <div className="h-72">
            {departmentData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={departmentData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:stroke-slate-800" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={10} angle={-15} textAnchor="end" interval={0} />
                  <YAxis stroke="#64748b" fontSize={11} allowDecimals={false} />
                  <Tooltip contentStyle={{ fontSize: '11px', borderRadius: '8px' }} />
                  <Legend wrapperStyle={{ fontSize: '11px', marginTop: '10px' }} />
                  <Bar dataKey="สำเร็จแล้ว" fill="#22c55e" radius={[4, 4, 0, 0]} stackId="a" />
                  <Bar dataKey="กำลังดำเนินการ" fill="#3b82f6" radius={[4, 4, 0, 0]} stackId="a" />
                  <Bar dataKey="รอรับเรื่อง" fill="#f97316" radius={[4, 4, 0, 0]} stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">
                ยังไม่มีข้อมูลหน่วยงานยื่นคำขอ
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 3. IT Operator Performance Summary Table (สรุปรายงานตาม IT ที่ดำเนินการ) */}
      <div id="it-operator-summary-card" className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md overflow-hidden">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-950 dark:to-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-5">
          <div className="flex items-center space-x-2.5">
            <Wrench className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-sans">สรุปผลงานตามเจ้าหน้าที่ IT ที่ดำเนินการ (IT Operator Summary)</h3>
          </div>
        </div>

        {/* IT Operator Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                <th className="py-3.5 px-6">เจ้าหน้าที่ IT ผู้ดูแล</th>
                <th className="py-3.5 px-6 text-center">รับงานทั้งหมด</th>
                <th className="py-3.5 px-6 text-center text-green-600 dark:text-green-400">ดำเนินการสำเร็จ</th>
                <th className="py-3.5 px-6 text-center text-orange-500 font-medium">รอดำเนินการ</th>
                <th className="py-3.5 px-6 text-center">อัตราความสำเร็จ</th>
                <th className="py-3.5 px-6 text-right">ทำรายการล่าสุดเมื่อ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs text-slate-700 dark:text-slate-300">
              {itOperatorData.map((op, index) => {
                const completionRate = op.total > 0 ? Math.round((op.completed / op.total) * 100) : 0;
                return (
                  <tr key={index} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                    <td className="py-3.5 px-6 font-semibold text-slate-800 dark:text-slate-200 flex items-center space-x-2.5">
                      <div className="h-2 w-2 rounded-full bg-blue-500 dark:bg-blue-400"></div>
                      <span>{op.name}</span>
                    </td>
                    <td className="py-3.5 px-6 text-center font-bold text-slate-800 dark:text-slate-100 font-mono">
                      {op.total}
                    </td>
                    <td className="py-3.5 px-6 text-center font-bold text-green-600 dark:text-green-400 font-mono">
                      <span className="px-2 py-0.5 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 rounded-full font-bold text-[10px]">
                        {op.completed}
                      </span>
                    </td>
                    <td className="py-3.5 px-6 text-center font-bold text-orange-600 dark:text-orange-400 font-mono">
                      <span className="px-2 py-0.5 bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400 rounded-full font-bold text-[10px]">
                        {op.pending}
                      </span>
                    </td>
                    <td className="py-3.5 px-6 text-center font-semibold font-mono">
                      {op.total > 0 ? (
                        <div className="flex items-center justify-center space-x-1.5">
                          <span className={completionRate >= 80 ? "text-green-600 dark:text-green-400" : "text-blue-600 dark:text-blue-400"}>
                            {completionRate}%
                          </span>
                          <div className="w-12 bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden hidden sm:block">
                            <div 
                              className={`h-1.5 rounded-full ${completionRate >= 80 ? "bg-green-500" : "bg-blue-500"}`}
                              style={{ width: `${completionRate}%` }}
                            ></div>
                          </div>
                        </div>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-3.5 px-6 text-right text-slate-400">
                      {op.lastActive ? (
                        new Date(op.lastActive).toLocaleDateString('th-TH', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })
                      ) : (
                        <span className="text-slate-300 dark:text-slate-700 font-mono text-[10px]">ไม่มีงานคงค้าง</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. Individual Request Summary Table (สรุปการขอรายงานรายบุคคล) */}
      <div id="individual-summary-card" className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-md overflow-hidden">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-slate-950 dark:to-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 py-5 flex flex-col xl:flex-row xl:items-center xl:justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center space-x-2.5">
              <Users className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white font-sans">สรุปรายงานการขอดึงข้อมูลรายบุคคล จำแนกตามรายหน่วยงาน</h3>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 font-medium">แสดงภาพรวมการขอดึงข้อมูลแยกรายบุคคลและแยกตามหน่วยงานสังกัดหลัก</p>
          </div>
          
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* View Mode Switcher */}
            <div className="bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg flex items-center border border-slate-200 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setIndividualViewMode('grouped')}
                className={`px-3 py-1 text-xs rounded-md transition-all font-medium flex items-center space-x-1.5 ${
                  individualViewMode === 'grouped'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <Layers className="h-3.5 w-3.5" />
                <span>จำแนกตามหน่วยงาน</span>
              </button>
              <button
                type="button"
                onClick={() => setIndividualViewMode('flat')}
                className={`px-3 py-1 text-xs rounded-md transition-all font-medium flex items-center space-x-1.5 ${
                  individualViewMode === 'flat'
                    ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                <Users className="h-3.5 w-3.5" />
                <span>รายคนทั้งหมด</span>
              </button>
            </div>

            {/* Search Box */}
            <div className="relative max-w-xs w-full sm:w-64">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="ค้นหาชื่อผู้ขอ / หน่วยงาน..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-1.5 w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 rounded-lg outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
        </div>

        {individualViewMode === 'grouped' ? (
          /* Grouped by Department View */
          <div className="p-6 space-y-4">
            {departmentGroupedData.length > 0 ? (
              departmentGroupedData.map((group, gIdx) => {
                const isCollapsed = expandedDepts[group.deptName] === false;
                return (
                  <div key={gIdx} className="border border-slate-150 dark:border-slate-800 rounded-xl overflow-hidden bg-slate-50/50 dark:bg-slate-950/20">
                    {/* Header Row for Department */}
                    <div 
                      onClick={() => toggleDept(group.deptName)}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 bg-slate-100/50 dark:bg-slate-900/40 hover:bg-slate-100 dark:hover:bg-slate-900/80 cursor-pointer transition-all border-b border-slate-150 dark:border-slate-800 gap-3"
                    >
                      <div className="flex items-center space-x-3">
                        <div className="shrink-0 text-slate-400">
                          {isCollapsed ? (
                            <ChevronRight className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </div>
                        <div className="bg-blue-50 dark:bg-blue-950/40 p-2 rounded-lg text-blue-600 dark:text-blue-400 shrink-0">
                          <FolderOpen className="h-4 w-4" />
                        </div>
                        <div>
                          <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">
                            {group.deptName}
                          </h4>
                          <p className="text-[10px] text-slate-400">
                            มีบุคลากรยื่นคำขอทั้งหมด {group.people.length} คน
                          </p>
                        </div>
                      </div>

                      {/* Right Hand Mini Stats */}
                      <div className="flex items-center space-x-3 self-end sm:self-center">
                        <div className="text-center px-2 py-0.5 bg-white dark:bg-slate-950 rounded-lg border border-slate-100 dark:border-slate-800">
                          <span className="text-[9px] text-slate-400 block font-semibold leading-none">ทั้งหมด</span>
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-200 font-mono mt-0.5 block">{group.totalRequests}</span>
                        </div>
                        <div className="text-center px-2 py-0.5 bg-white dark:bg-slate-950 rounded-lg border border-slate-100 dark:border-slate-800">
                          <span className="text-[9px] text-orange-500 block font-semibold leading-none">รอรับเรื่อง</span>
                          <span className="text-xs font-bold text-orange-600 dark:text-orange-400 font-mono mt-0.5 block">{group.pendingRequests}</span>
                        </div>
                        <div className="text-center px-2 py-0.5 bg-white dark:bg-slate-950 rounded-lg border border-slate-100 dark:border-slate-800">
                          <span className="text-[9px] text-blue-500 block font-semibold leading-none">กำลังดำเนินการ</span>
                          <span className="text-xs font-bold text-blue-600 dark:text-blue-400 font-mono mt-0.5 block">{group.processingRequests}</span>
                        </div>
                        <div className="text-center px-2 py-0.5 bg-white dark:bg-slate-950 rounded-lg border border-slate-100 dark:border-slate-800">
                          <span className="text-[9px] text-green-500 block font-semibold leading-none">สำเร็จ</span>
                          <span className="text-xs font-bold text-green-600 dark:text-green-400 font-mono mt-0.5 block">{group.completedRequests}</span>
                        </div>
                      </div>
                    </div>

                    {/* Expandable nested table */}
                    {!isCollapsed && (
                      <div className="overflow-x-auto bg-white dark:bg-slate-900/20">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-50/50 dark:bg-slate-900/10 border-b border-slate-100 dark:border-slate-800 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                              <th className="py-2.5 px-6">ชื่อบุคลากร (ผู้ยื่นขอ)</th>
                              <th className="py-2.5 px-6">เบอร์โทรศัพท์ติดต่อ</th>
                              <th className="py-2.5 px-6 text-center">ทั้งหมด</th>
                              <th className="py-2.5 px-6 text-center text-orange-500">รอรับเรื่อง</th>
                              <th className="py-2.5 px-6 text-center text-blue-500">กำลังดำเนินการ</th>
                              <th className="py-2.5 px-6 text-center text-green-600 dark:text-green-400">สำเร็จแล้ว</th>
                              <th className="py-2.5 px-6 text-right">คำขอล่าสุดเมื่อ</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs text-slate-700 dark:text-slate-300">
                            {group.people.map((person, pIdx) => (
                              <tr key={pIdx} className="hover:bg-slate-50/40 dark:hover:bg-slate-800/10 transition-colors">
                                <td className="py-2.5 px-6 font-semibold text-slate-800 dark:text-slate-200">
                                  {person.name}
                                </td>
                                <td className="py-2.5 px-6 font-mono text-slate-500 dark:text-slate-400">
                                  {person.phone}
                                </td>
                                <td className="py-2.5 px-6 text-center font-bold text-slate-800 dark:text-slate-100 font-mono">
                                  {person.total}
                                </td>
                                <td className="py-2.5 px-6 text-center font-bold text-orange-600 dark:text-orange-400 font-mono">
                                  <span className="px-1.5 py-0.5 bg-orange-50 dark:bg-orange-950/20 text-orange-700 dark:text-orange-400 rounded text-[9px] font-bold">
                                    {person.pending}
                                  </span>
                                </td>
                                <td className="py-2.5 px-6 text-center font-bold text-blue-600 dark:text-blue-400 font-mono">
                                  <span className="px-1.5 py-0.5 bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-400 rounded text-[9px] font-bold">
                                    {person.processing}
                                  </span>
                                </td>
                                <td className="py-2.5 px-6 text-center font-bold text-green-600 dark:text-green-400 font-mono">
                                  <span className="px-1.5 py-0.5 bg-green-50 dark:bg-green-950/20 text-green-700 dark:text-green-400 rounded text-[9px] font-bold">
                                    {person.completed}
                                  </span>
                                </td>
                                <td className="py-2.5 px-6 text-right text-slate-400">
                                  {new Date(person.lastRequest).toLocaleDateString('th-TH', {
                                    year: 'numeric',
                                    month: 'short',
                                    day: 'numeric'
                                  })}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <div className="py-12 text-center text-slate-400 text-xs">
                ไม่พบหน่วยงานหลักหรือบุคคลที่ตรงตามเงื่อนไขค้นหา
              </div>
            )}
          </div>
        ) : (
          /* Flat Table View */
          <div className="overflow-x-auto">
            {individualData.length > 0 ? (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950/40 border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                    <th className="py-3.5 px-6">ชื่อบุคลากร (ผู้ยื่นขอ)</th>
                    <th className="py-3.5 px-6">เบอร์โทรศัพท์ติดต่อ</th>
                    <th className="py-3.5 px-6">หน่วยงานหลัก</th>
                    <th className="py-3.5 px-6 text-center">ส่งคำขอทั้งหมด</th>
                    <th className="py-3.5 px-6 text-center text-orange-500">รอรับเรื่อง</th>
                    <th className="py-3.5 px-6 text-center text-blue-500">กำลังดำเนินการ</th>
                    <th className="py-3.5 px-6 text-center text-green-600 dark:text-green-400">สำเร็จแล้ว</th>
                    <th className="py-3.5 px-6 text-right">คำขอล่าสุดเมื่อ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs text-slate-700 dark:text-slate-300">
                  {individualData.map((person, index) => (
                    <tr key={index} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                      <td className="py-3.5 px-6 font-semibold text-slate-800 dark:text-slate-200">{person.name}</td>
                      <td className="py-3.5 px-6 font-mono text-slate-500 dark:text-slate-400">{person.phone}</td>
                      <td className="py-3.5 px-6">{person.dept.split(' (')[0] || person.dept}</td>
                      <td className="py-3.5 px-6 text-center font-bold text-slate-800 dark:text-slate-100 font-mono">{person.total}</td>
                      <td className="py-3.5 px-6 text-center font-bold text-orange-600 dark:text-orange-400 font-mono">
                        <span className="px-2 py-0.5 bg-orange-50 dark:bg-orange-950/30 text-orange-700 dark:text-orange-400 rounded-full font-bold text-[10px]">
                          {person.pending}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 text-center font-bold text-blue-600 dark:text-blue-400 font-mono">
                        <span className="px-2 py-0.5 bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-400 rounded-full font-bold text-[10px]">
                          {person.processing}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 text-center font-bold text-green-600 dark:text-green-400 font-mono">
                        <span className="px-2 py-0.5 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 rounded-full font-bold text-[10px]">
                          {person.completed}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 text-right text-slate-400">
                        {new Date(person.lastRequest).toLocaleDateString('th-TH', {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="py-8 text-center text-slate-400 text-xs">
                ไม่พบข้อมูลผู้ขอรายงานข้อมูลที่ตรงตามเงื่อนไขค้นหา
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
