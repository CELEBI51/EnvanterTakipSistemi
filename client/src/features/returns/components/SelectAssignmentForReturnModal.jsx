import React, { useState, useEffect } from 'react';
import { X, Search, RotateCcw, User, Calendar, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../../store/authStore';

export default function SelectAssignmentForReturnModal({ isOpen, onClose, initialSearch = '' }) {
  const navigate = useNavigate();
  const token = useAuthStore((state) => state.accessToken);

  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState(initialSearch);

  useEffect(() => {
    if (isOpen) {
      setSearchQuery(initialSearch);
      fetchEligibleAssignments();
    }
  }, [isOpen, initialSearch, token]);


  const fetchEligibleAssignments = async () => {
    setLoading(true);
    setError('');

    try {
      // Fetch assignments (page 1, pageSize 100)
      const res = await fetch('http://localhost:5000/api/assignments?pageSize=100', {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await res.json();
      if (res.ok && data.data) {
        // Filter ONLY active or partially returned assignments WITH returnable hardware or accessories
        const eligible = data.data.filter((a) => {
          const isNotFullyReturned = a.status !== 'İade Edildi' && a.status !== 'IadeEdildi';
          if (!isNotFullyReturned) return false;

          const hasReturnableHw = a.items && a.items.some((item) => !item.returned);
          const hasReturnableAcc = a.accessoryItems && a.accessoryItems.some((acc) => acc.quantityGiven - acc.quantityReturned > 0);

          return hasReturnableHw || hasReturnableAcc;
        });
        setAssignments(eligible);

      } else {
        throw new Error(data.message || 'Zimmet kayıtları alınamadı.');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const filteredAssignments = assignments.filter((item) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const name = item.employee?.fullName?.toLowerCase() || '';
    const tc = item.employee?.tcNo?.toLowerCase() || '';
    const unitName = item.employee?.unit?.name?.toLowerCase() || '';
    return name.includes(q) || tc.includes(q) || unitName.includes(q);
  });

  const handleSelectAssignment = (assignmentId) => {
    onClose();
    navigate(`/returns/create?assignmentId=${assignmentId}`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in zoom-in-95 duration-150">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#1E2534] text-white">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-heading text-base font-bold">İade Yapılacak Zimmeti Seçin</h2>
              <p className="text-xs text-slate-300">
                Lütfen iade almak istediğiniz aktif veya kısmi zimmet kaydını seçiniz.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Personel adı, T.C. No veya birim ile ara..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white text-xs font-medium text-[#1E2534] placeholder-slate-400 focus:border-[#4F8FE0] transition"
            />
          </div>
        </div>

        {/* List Content */}
        <div className="p-4 overflow-y-auto space-y-3 flex-1">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400 font-medium">
              Aktif zimmetler yükleniyor...
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs">
              {error}
            </div>
          ) : filteredAssignments.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400 font-medium">
              İade edilebilir aktif zimmet kaydı bulunamadı.
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredAssignments.map((item) => {
                const itemCount =
                  (item.items?.length || 0) +
                  (item.accessoryItems?.length || 0);

                return (
                  <div
                    key={item.id}
                    onClick={() => handleSelectAssignment(item.id)}
                    className="p-4 bg-white hover:bg-[#EAF2FC]/40 border border-slate-200 rounded-xl shadow-2xs transition flex items-center justify-between gap-4 cursor-pointer group"
                  >
                    <div className="space-y-1.5 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#1E2534] text-xs truncate">
                          {item.employee?.fullName}
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            item.status === 'Aktif'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {item.status}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500 font-medium">
                        <span>Birim: {item.employee?.unit?.name || '-'}</span>
                        <span>Sicil No: {item.employee?.tcNo}</span>

                        <span>
                          Teslim:{' '}
                          {item.teslimTarihi && !isNaN(new Date(item.teslimTarihi).getTime())
                            ? new Date(item.teslimTarihi).toLocaleDateString('tr-TR')
                            : '-'}
                        </span>
                      </div>

                      <div className="text-[11px] font-bold text-[#4F8FE0]">
                        Kalan İade Edilebilir Kalemler: {itemCount} Kalem
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectAssignment(item.id);
                      }}
                      className="px-3.5 py-2 rounded-xl bg-[#1E2534] text-white text-xs font-bold hover:bg-slate-800 transition cursor-pointer flex items-center gap-1.5 shrink-0 group-hover:bg-[#4F8FE0]"
                    >
                      İade Al <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
