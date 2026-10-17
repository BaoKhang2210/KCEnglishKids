import React, { useState } from 'react';
import { History, Search, ShieldCheck } from 'lucide-react';

interface AuditTabProps {
  auditLogs: any[];
  loading: boolean;
}

export const AuditTab: React.FC<AuditTabProps> = ({ auditLogs, loading }) => {
  const [filterAction, setFilterAction] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredLogs = auditLogs.filter((log) => {
    const matchAction = filterAction === 'ALL' || log.action === filterAction;
    const matchSearch =
      !searchQuery ||
      log.user?.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      log.targetType?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      JSON.stringify(log.details || {}).toLowerCase().includes(searchQuery.toLowerCase());
    return matchAction && matchSearch;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
            <History className="w-6 h-6 text-indigo-600" />
            <span>Nhật Ký Kiểm Toán Hệ Thống (Audit Logs)</span>
          </h2>
          <p className="text-xs font-semibold text-slate-400 mt-1">
            Ghi vết toàn diện mọi hoạt động cấp tài khoản, đổi PIN, phân công lớp và cấu hình quản trị
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3.5 py-2 rounded-xl">
          <ShieldCheck className="w-4 h-4" />
          <span>Hệ thống bảo mật ghi vết thời gian thực</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Tìm theo người thực hiện, đối tượng hoặc nội dung thao tác..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-400 font-medium outline-none"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-bold text-slate-400 whitespace-nowrap">Hành động:</span>
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="text-xs font-black text-slate-800 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 outline-none cursor-pointer"
          >
            <option value="ALL">Tất cả hành động</option>
            <option value="CREATE_USER">Tạo người dùng (CREATE_USER)</option>
            <option value="UPDATE_USER">Cập nhật người dùng (UPDATE_USER)</option>
            <option value="LOCK_USER">Khóa tài khoản (LOCK_USER)</option>
            <option value="UNLOCK_USER">Mở khóa tài khoản (UNLOCK_USER)</option>
            <option value="RESET_PIN">Đặt lại mã PIN (RESET_PIN)</option>
            <option value="CREATE_CLASSROOM">Tạo lớp học (CREATE_CLASSROOM)</option>
            <option value="UPDATE_CLASSROOM">Cập nhật lớp (UPDATE_CLASSROOM)</option>
            <option value="TOGGLE_LESSON">Bật/tắt bài học (TOGGLE_LESSON)</option>
            <option value="UPDATE_SETTINGS">Cập nhật cài đặt (UPDATE_SETTINGS)</option>
          </select>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
        {loading ? (
          <div className="py-20 text-center text-slate-400 font-bold">
            <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Đang tải nhật ký kiểm toán…
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="py-16 text-center text-slate-400 font-bold">
            Chưa có bản ghi nhật ký nào phù hợp.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 uppercase font-black">
                <tr>
                  <th className="py-3.5 px-4">Thời gian</th>
                  <th className="py-3.5 px-4">Người thực hiện</th>
                  <th className="py-3.5 px-4">Hành động</th>
                  <th className="py-3.5 px-4">Đối tượng</th>
                  <th className="py-3.5 px-4">Chi tiết thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-semibold text-slate-700">
                {filteredLogs.map((log) => (
                  <tr key={log._id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3.5 px-4 font-mono text-slate-400 whitespace-nowrap text-[11px]">
                      {new Date(log.createdAt).toLocaleString()}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {log.user?.name || 'Administrator'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-0.5 rounded-md font-black text-[10px] bg-indigo-100 text-indigo-800 uppercase tracking-wide">
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-600">
                      {log.targetType || 'User'}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-500 max-w-sm truncate text-[11px]">
                      {typeof log.details === 'object' ? JSON.stringify(log.details) : String(log.details || '')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
