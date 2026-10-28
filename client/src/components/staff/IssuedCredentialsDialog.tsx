import { Download, KeyRound, X } from 'lucide-react';
import * as XLSX from 'xlsx';

export interface IssuedCredential { name: string; username: string; pin: string }
export function IssuedCredentialsDialog({ credentials, onClose }: { credentials: IssuedCredential[]; onClose: () => void }) {
  if (!credentials.length) return null;
  return <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-labelledby="credentials-title">
    <div className="w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-6">
      <div className="flex items-start justify-between gap-4">
        <div><h2 id="credentials-title" className="flex items-center gap-2 text-xl font-bold"><KeyRound size={22} /> Thông tin đăng nhập vừa cấp</h2>
          <p className="mt-2 text-slate-600">Lưu danh sách trước khi đóng. Mã PIN chỉ hiển thị trong lần cấp này.</p></div>
        <button type="button" aria-label="Đóng thông tin đăng nhập" onClick={onClose}><X size={22} /></button>
      </div>
      <div className="my-5 max-h-[50vh] overflow-auto rounded-xl border border-slate-200"><table>
        <thead><tr><th>Học sinh</th><th>Mã đăng nhập</th><th>PIN</th></tr></thead>
        <tbody>{credentials.map((item, index) => <tr key={`${item.username}-${index}`}><td>{item.name}</td><td className="font-mono">{item.username}</td><td className="font-mono font-bold">{item.pin}</td></tr>)}</tbody>
      </table></div>
      <div className="flex flex-wrap justify-end gap-3">
        <button type="button" className="rounded-xl border border-slate-300 px-4 py-2 font-semibold" onClick={onClose}>Đã lưu, đóng</button>
        <button type="button" className="flex items-center gap-2 rounded-xl bg-indigo-700 px-4 py-2 font-semibold text-white" onClick={() => {
          const sheet = XLSX.utils.aoa_to_sheet([['Học sinh', 'Mã đăng nhập', 'PIN'], ...credentials.map(item => [item.name, item.username, String(item.pin)])]);
          sheet['!cols'] = [{ wch: 30 }, { wch: 24 }, { wch: 12 }];
          const workbook = XLSX.utils.book_new();
          XLSX.utils.book_append_sheet(workbook, sheet, 'DangNhap');
          XLSX.writeFile(workbook, 'Thong_tin_dang_nhap.xlsx');
        }}><Download size={18} /> Tải danh sách Excel</button>
      </div>
    </div>
  </div>;
}
