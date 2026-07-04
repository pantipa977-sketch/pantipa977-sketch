import { User } from 'firebase/auth';
import { LogIn, LogOut, Activity, Database } from 'lucide-react';
import { signInWithGoogle, signOutUser } from '../firebase';

interface HeaderProps {
  user: User | null;
  loading: boolean;
  activeView?: 'dashboard' | 'form' | 'list';
  setActiveView?: (view: 'dashboard' | 'form' | 'list') => void;
  requestsCount?: number;
}

export default function Header({ user, loading, activeView, setActiveView, requestsCount = 0 }: HeaderProps) {
  return (
    <header id="app-header" className="bg-white dark:bg-slate-900 text-slate-800 dark:text-white border-b border-slate-200 dark:border-slate-800 h-16 flex items-center justify-between px-4 sm:px-8 shrink-0 sticky top-0 z-50 shadow-sm">
      {/* Brand & Project Info */}
      <div className="flex items-center space-x-3 min-w-0">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white shrink-0 md:hidden">
          <Activity className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <h1 className="text-sm sm:text-base md:text-lg font-extrabold text-slate-900 dark:text-white tracking-wide truncate">
            ระบบรับเรื่องและติดตามการขอรายงานข้อมูล
          </h1>
          <p className="text-xs text-blue-600 dark:text-blue-400 font-bold truncate hidden xs:block mt-0.5">
            กลุ่มงานสุขภาพดิจิทัล
          </p>
        </div>
      </div>

      {/* Right side controls: Status badge + Login/User */}
      <div className="flex items-center space-x-3 sm:space-x-4 shrink-0">


        {/* User profile controls */}
        <div className="flex items-center">
          {loading ? (
            <div className="h-8 w-24 bg-slate-100 dark:bg-slate-800 rounded-md animate-pulse"></div>
          ) : user ? (
            <div className="flex items-center space-x-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full pl-2 pr-1 py-1 sm:pl-3 sm:pr-1.5 sm:py-1.5">
              <div className="text-right hidden sm:block max-w-[120px]">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{user.displayName || 'บุคลากร'}</p>
                <p className="text-[9px] text-slate-400 font-mono truncate">{user.email}</p>
              </div>
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'Profile'}
                  className="h-7 w-7 sm:h-8 sm:w-8 rounded-full border border-slate-200 dark:border-slate-600"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold font-mono">
                  {(user.displayName || user.email || '?')[0].toUpperCase()}
                </div>
              )}
              <button
                id="btn-signout"
                onClick={signOutUser}
                title="ออกจากระบบ"
                className="p-1 sm:p-1.5 hover:bg-rose-500/15 text-slate-400 hover:text-rose-500 rounded-full transition-colors"
              >
                <LogOut className="h-3.5 sm:h-4 sm:w-4" />
              </button>
            </div>
          ) : (
            <button
              id="btn-signin"
              onClick={signInWithGoogle}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white font-medium px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg text-xs sm:text-sm shadow-sm transition-all active:scale-95"
            >
              <LogIn className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>เข้าสู่ระบบด้วย Google</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
