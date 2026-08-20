import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  RotateCcw,
  CheckCircle2,
  Download,
  Calendar,
  UserCheck,
  User,
  AlertCircle,
} from 'lucide-react';
import useAuthStore from '../../../store/authStore';
import { API_BASE_URL } from '../../../config';
import FileUploadField from '../../../components/common/FileUploadField';
import PendingMaintenanceFormModal from '../components/PendingMaintenanceFormModal';

export default function CreateReturnPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const assignmentIdParam = searchParams.get('assignmentId');

  const token = useAuthStore((state) => state.accessToken);
  const currentUser = useAuthStore((state) => state.user);

  const [assignment, setAssignment] = useState(null);
  const [loadingAssignment, setLoadingAssignment] = useState(true);
  const [assignmentError, setAssignmentError] = useState('');

  // Form Inputs
  const [teslimAlanIc, setTeslimAlanIc] = useState(currentUser?.fullName || '');
  const [tarih, setTarih] = useState(new Date().toISOString().slice(0, 10));

  // Selected Return Items State
  // Hardware: { [hardwareId]: { selected: boolean, resultStatus: 'Hazır'|'Arızalı'|'Serviste'|'Kullanım Dışı' } }
  const [hardwareState, setHardwareState] = useState({});

  // Accessory: { [accessoryId]: { hazirQty: number, arizaliQty: number } }
  const [accessoryState, setAccessoryState] = useState({});

  // Submission State
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [createdReturn, setCreatedReturn] = useState(null);

  // Pending Maintenance Data State ({ [hardwareId]: formData })
  const [pendingMaintenanceData, setPendingMaintenanceData] = useState({});
  const [maintenanceCompletedForIds, setMaintenanceCompletedForIds] = useState(new Set());
  const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false);
  const [selectedHardwareForMaintenance, setSelectedHardwareForMaintenance] = useState(null);
  const [previousStatusMap, setPreviousStatusMap] = useState({});

  const handlePendingMaintenanceSave = (formData) => {
    if (selectedHardwareForMaintenance) {
      const hwId = selectedHardwareForMaintenance.id;
      setPendingMaintenanceData((prev) => ({
        ...prev,
        [hwId]: formData,
      }));
      setMaintenanceCompletedForIds((prev) => {
        const nextSet = new Set(prev);
        nextSet.add(hwId);
        return nextSet;
      });
    }
    setIsMaintenanceModalOpen(false);
  };

  const handlePendingMaintenanceClose = () => {
    if (
      selectedHardwareForMaintenance &&
      !maintenanceCompletedForIds.has(selectedHardwareForMaintenance.id)
    ) {
      const hwId = selectedHardwareForMaintenance.id;
      const prevStatus = previousStatusMap[hwId] || 'Hazır';
      setHardwareState((prev) => ({
        ...prev,
        [hwId]: {
          ...prev[hwId],
          resultStatus: prevStatus === 'Serviste' ? 'Hazır' : prevStatus,
        },
      }));
    }
    setIsMaintenanceModalOpen(false);
  };

  const handleStatusChange = (hwId, newStatus) => {
    const currentStatus = hardwareState[hwId]?.resultStatus || 'Hazır';

    if (newStatus === 'Serviste' && !maintenanceCompletedForIds.has(hwId)) {
      setPreviousStatusMap((prev) => ({ ...prev, [hwId]: currentStatus }));
      setHardwareState((prev) => ({
        ...prev,
        [hwId]: { ...prev[hwId], resultStatus: 'Serviste' },
      }));

      const hwItem = assignment?.items?.find((i) => i.hardwareId === hwId)?.hardware;
      const hwName = hwItem ? `${hwItem.brand} ${hwItem.model || ''} (${hwItem.demirbasNo})` : 'Varlık';

      setSelectedHardwareForMaintenance({ id: hwId, name: hwName });
      setIsMaintenanceModalOpen(true);
    } else {
      setHardwareState((prev) => ({
        ...prev,
        [hwId]: { ...prev[hwId], resultStatus: newStatus },
      }));
    }
  };

  const handleCancelReturn = () => {
    setPendingMaintenanceData({});
    setMaintenanceCompletedForIds(new Set());
    navigate('/assignments');
  };

  // Signed Form Upload in Success State
  const [signedFile, setSignedFile] = useState(null);
  const [uploadingSignedForm, setUploadingSignedForm] = useState(false);
  const [uploadMessage, setUploadMessage] = useState('');

  useEffect(() => {
    if (assignmentIdParam) {
      fetchAssignmentDetail(assignmentIdParam);
    } else {
      setAssignmentError('İade yapılacak zimmet kaydı seçilmedi.');
      setLoadingAssignment(false);
    }
  }, [assignmentIdParam, token]);

  const fetchAssignmentDetail = async (id) => {
    setLoadingAssignment(true);
    setAssignmentError('');
    try {
      const res = await fetch(`${API_BASE_URL}/assignments/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.data) {
        const assignData = data.data;

        if (assignData.status === 'İade Edildi' || assignData.status === 'IadeEdildi') {
          throw new Error('Bu zimmet kaydı zaten tamamen iade edilmiş.');
        }

        setAssignment(assignData);

        // Initialize Hardware State
        const hwInit = {};
        if (assignData.items) {
          assignData.items.forEach((item) => {
            if (!item.returned) {
              hwInit[item.hardwareId] = { selected: false, resultStatus: 'Hazır' };
            }
          });
        }
        setHardwareState(hwInit);

        // Initialize Accessory State
        const accInit = {};
        if (assignData.accessoryItems) {
          assignData.accessoryItems.forEach((acc) => {
            const remaining = acc.quantityGiven - acc.quantityReturned;
            if (remaining > 0) {
              accInit[acc.accessoryId] = { hazirQty: 0, arizaliQty: 0 };
            }
          });
        }
        setAccessoryState(accInit);
      } else {
        throw new Error(data.message || 'Zimmet kaydı bulunamadı.');
      }
    } catch (err) {
      setAssignmentError(err.message);
    } finally {
      setLoadingAssignment(false);
    }
  };

  const handleSubmitReturn = async (e) => {
    e.preventDefault();
    setSubmitError('');

    if (!teslimAlanIc.trim()) {
      setSubmitError('İadeyi teslim alan IT personel bilgisi zorunludur.');
      return;
    }

    // Build Hardware Items Payload
    const hardwareItemsPayload = [];
    Object.keys(hardwareState).forEach((hwId) => {
      const state = hardwareState[hwId];
      if (state.selected) {
        hardwareItemsPayload.push({
          hardwareId: hwId,
          resultStatus: state.resultStatus || 'Hazır',
        });
      }
    });

    // Build Accessory Items Payload
    const accessoryItemsPayload = [];
    let accValidationError = '';

    if (assignment?.accessoryItems) {
      assignment.accessoryItems.forEach((acc) => {
        const remaining = acc.quantityGiven - acc.quantityReturned;
        const state = accessoryState[acc.accessoryId] || { hazirQty: 0, arizaliQty: 0 };
        const hazirQty = parseInt(state.hazirQty, 10) || 0;
        const arizaliQty = parseInt(state.arizaliQty, 10) || 0;

        if (hazirQty + arizaliQty > remaining) {
          accValidationError = `${acc.accessory?.name || 'Aksesuar'} için girilen toplam miktar (${hazirQty + arizaliQty}) kalan iade miktarını (${remaining}) aşamaz.`;
        }

        if (hazirQty > 0) {
          accessoryItemsPayload.push({
            accessoryId: acc.accessoryId,
            quantity: hazirQty,
            resultStatus: 'Hazır',
          });
        }
        if (arizaliQty > 0) {
          accessoryItemsPayload.push({
            accessoryId: acc.accessoryId,
            quantity: arizaliQty,
            resultStatus: 'Arızalı',
          });
        }
      });
    }

    if (accValidationError) {
      setSubmitError(accValidationError);
      return;
    }

    // Validate at least one item selected
    if (hardwareItemsPayload.length === 0 && accessoryItemsPayload.length === 0) {
      setSubmitError('İade yapmak için en az bir varlık veya aksesuar kalemi miktarını girmelisiniz.');
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch(`${API_BASE_URL}/returns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          assignmentId: assignment.id,
          teslimAlanIc: teslimAlanIc.trim(),
          tarih,
          hardwareItems: hardwareItemsPayload,
          accessoryItems: accessoryItemsPayload,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'İade oluşturulurken hata oluştu.');
      }

      // Create maintenance records in DB only now after return is created successfully
      for (const hwId of Object.keys(pendingMaintenanceData)) {
        const itemState = hardwareState[hwId];
        if (itemState && itemState.selected && itemState.resultStatus === 'Serviste') {
          const mData = pendingMaintenanceData[hwId];
          if (mData) {
            const maintRes = await fetch(`${API_BASE_URL}/maintenance`, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                hardwareId: hwId,
                ...mData,
              }),
            });

            const maintData = await maintRes.json();
            if (!maintRes.ok) {
              throw new Error(
                maintData.message ||
                'İade kaydedildi ancak bakım kaydı oluşturulurken bir hata oluştu.'
              );
            }
          }
        }
      }

      setCreatedReturn(data.data);
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleUploadSignedForm = async () => {
    if (!signedFile || !createdReturn) return;

    setUploadingSignedForm(true);
    setUploadMessage('');

    try {
      const formData = new FormData();
      formData.append('file', signedFile);

      const res = await fetch(`${API_BASE_URL}/returns/${createdReturn.id}/signed-form`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'İmzalı belge yükleme başarısız.');

      setUploadMessage('İmzalı iade belgesi başarıyla yüklendi!');
    } catch (err) {
      alert(err.message);
    } finally {
      setUploadingSignedForm(false);
    }
  };

  // SUCCESS SCREEN (BÖLÜM B)
  if (createdReturn) {
    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-xs text-center space-y-6">
          <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div>
            <h2 className="text-xl font-bold text-[#1E2534]">Zimmet İadesi Başarıyla Kaydedildi!</h2>
            <p className="text-xs text-slate-500 mt-1">
              İade formu otomatik olarak üretildi. Dilerseniz PDF'i indirebilir veya hemen imzalı iade belgesini yükleyebilirsiniz.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 pt-2">
            <button
              onClick={() => window.open(`${API_BASE_URL}/returns/${createdReturn.id}/pdf?token=${token}`, '_blank')}
              className="px-5 py-2.5 rounded-xl bg-[#1E2534] text-white text-xs font-bold hover:bg-slate-800 transition cursor-pointer flex items-center gap-2"
            >
              <Download className="w-4 h-4" /> İade PDF'ini İndir
            </button>

            <button
              onClick={() => navigate('/returns')}
              className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 transition cursor-pointer"
            >
              İade Listesine Dön
            </button>
          </div>

          {/* Opsiyonel İmzalı Form Yükleme */}
          <div className="p-5 bg-slate-50 border border-slate-200 rounded-xl text-left space-y-3 mt-6">
            <span className="text-xs font-bold text-[#1E2534] uppercase tracking-wider block">
              Opsiyonel: İmzalı İade Formu Yükle
            </span>

            {uploadMessage ? (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl">
                {uploadMessage}
              </div>
            ) : (
              <div className="space-y-3">
                <FileUploadField
                  label="Taranmış veya Fotoğraflanmış İmzalı İade Formu (PDF, JPG, PNG)"
                  selectedFile={signedFile}
                  onFileSelect={setSignedFile}
                />
                {signedFile && (
                  <button
                    onClick={handleUploadSignedForm}
                    disabled={uploadingSignedForm}
                    className="px-4 py-2 bg-[#4F8FE0] text-white text-xs font-bold rounded-xl hover:bg-blue-600 transition disabled:opacity-50 cursor-pointer"
                  >
                    {uploadingSignedForm ? 'Yükleniyor...' : 'İmzalı İade Belgesini Kaydet'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        <PendingMaintenanceFormModal
          isOpen={isMaintenanceModalOpen}
          onClose={handlePendingMaintenanceClose}
          onSave={handlePendingMaintenanceSave}
          hardwareName={selectedHardwareForMaintenance?.name || ''}
        />
      </div>
    );
  }

  if (loadingAssignment) {
    return <div className="py-12 text-center text-xs font-semibold text-slate-500">Zimmet bilgisi yükleniyor...</div>;
  }

  if (assignmentError) {
    return (
      <div className="max-w-xl mx-auto p-6 bg-white border border-slate-200 rounded-2xl shadow-xs text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-rose-500 mx-auto" />
        <p className="text-sm font-bold text-rose-700">{assignmentError}</p>
        <button
          onClick={() => navigate('/assignments')}
          className="px-4 py-2 bg-[#1E2534] text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition cursor-pointer"
        >
          Zimmet Listesine Dön
        </button>
      </div>
    );
  }

  const unreturnedHw = assignment?.items?.filter((i) => !i.returned) || [];
  const unreturnedAcc = assignment?.accessoryItems?.filter((a) => a.quantityGiven - a.quantityReturned > 0) || [];

  if (unreturnedHw.length === 0 && unreturnedAcc.length === 0) {
    return (
      <div className="max-w-xl mx-auto p-8 bg-white border border-slate-200 rounded-2xl shadow-xs text-center space-y-4">
        <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-bold text-[#1E2534]">İade Edilebilir Kalem Bulunmuyor</h3>
          <p className="text-xs text-slate-500">
            Bu zimmette iade edilebilir kalem bulunmuyor. Sarf malzemeler tüketim yapıldığı için iade edilemez.
          </p>
        </div>
        <button
          onClick={() => navigate('/assignments')}
          className="px-5 py-2.5 bg-[#1E2534] text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition cursor-pointer"
        >
          Zimmet Listesine Dön
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/assignments')}
            className="p-2 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-[#1E2534]">Zimmet İadesi Al</h1>
            <p className="text-xs text-slate-500">Zimmette kalan iade edilebilir kalemleri seçip iade alınız.</p>
          </div>
        </div>
      </div>

      {submitError && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold rounded-xl">
          {submitError}
        </div>
      )}

      {/* BÖLÜM A: ZİMMET ÖZETİ & İADE BİLGİLERİ KARTI */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* ZİMMET ÖZETİ (SALT OKUNUR) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center gap-2 text-[#4F8FE0]">
            <User className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">İADE EDEN PERSONEL (ZİMMET SAHİBİ)</span>
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 space-y-1 text-xs">
            <p className="text-sm font-bold text-[#1E2534]">{assignment.employee?.fullName}</p>
            <p className="text-slate-600 font-mono">Sicil No: {assignment.employee?.tcNo}</p>
            <p className="text-slate-600">Birim: {assignment.employee?.unit?.name || '-'}</p>

            <p className="text-slate-400 text-[11px] mt-1">
              Veriliş Tarihi: {new Date(assignment.teslimTarihi).toLocaleDateString('tr-TR')} (Teslim Eden: {assignment.teslimEden})
            </p>
          </div>
        </div>

        {/* İADE ALAN IT PERSONELİ & İADE TARİHİ GİRDİLERİ */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center gap-2 text-[#4F8FE0]">
            <UserCheck className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">İADE ALAN IT & TARİH</span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                İadeyi Teslim Alan IT Personel <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                value={teslimAlanIc}
                onChange={(e) => setTeslimAlanIc(e.target.value)}
                placeholder="Örn: Ahmet IT Uzmanı"
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-[#1E2534] focus:border-[#4F8FE0] focus:bg-white transition"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                İade Tarihi <span className="text-rose-600">*</span>
              </label>
              <input
                type="date"
                value={tarih}
                onChange={(e) => setTarih(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-[#1E2534] focus:border-[#4F8FE0] focus:bg-white transition"
                required
              />
            </div>
          </div>
        </div>
      </div>

      {/* BÖLÜM A: İADE EDİLECEK KALEMLER (Sadece henüz iade edilmemişler, Sarf Malzeme HİÇ yok) */}
      <form onSubmit={handleSubmitReturn} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h2 className="text-xs font-bold text-[#1E2534] uppercase tracking-wider">
            İade Edilecek Kalemleri Seçin
          </h2>
          <span className="text-[11px] text-slate-400 font-medium italic">
            * Sarf malzemeler tüketim yapıldığı için iade listesinde yer almaz.
          </span>
        </div>

        {/* 1. VARLIKLAR (HARDWARE) */}
        {unreturnedHw.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-blue-600"></span> Varlık / Donanımlar ({unreturnedHw.length})
            </h3>

            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
              {unreturnedHw.map((item) => {
                const state = hardwareState[item.hardwareId] || { selected: false, resultStatus: 'Hazır' };

                return (
                  <div key={item.id} className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 hover:bg-slate-50 transition">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={state.selected}
                        onChange={(e) =>
                          setHardwareState((prev) => ({
                            ...prev,
                            [item.hardwareId]: { ...state, selected: e.target.checked },
                          }))
                        }
                        className="w-4 h-4 rounded text-[#4F8FE0] border-slate-300 focus:ring-[#4F8FE0]"
                      />
                      <div>
                        <p className="text-xs font-bold text-[#1E2534]">
                          {item.hardware?.brand} {item.hardware?.model} ({item.hardware?.demirbasNo})
                        </p>
                        <p className="text-[11px] text-slate-500 font-mono">Seri No: {item.hardware?.serialNo}</p>
                      </div>
                    </label>

                    {state.selected && (
                      <div className="flex items-center gap-2">
                        <label className="text-[11px] font-bold text-slate-600 uppercase">Sonuç Durumu:</label>
                        <select
                          value={state.resultStatus}
                          onChange={(e) => handleStatusChange(item.hardwareId, e.target.value)}
                          className="px-3 py-1.5 rounded-lg border border-slate-300 bg-white text-xs font-bold text-slate-800"
                        >
                          <option value="Hazır">Hazır (Sağlam)</option>
                          <option value="Arızalı">Arızalı</option>
                          <option value="Serviste">Serviste</option>
                          <option value="Kullanım Dışı">Kullanım Dışı</option>
                        </select>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* 2. AKSESUARLAR */}
        {unreturnedAcc.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-purple-600"></span> Aksesuarlar ({unreturnedAcc.length})
            </h3>

            <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
              {unreturnedAcc.map((acc) => {
                const remaining = acc.quantityGiven - acc.quantityReturned;
                const state = accessoryState[acc.accessoryId] || { hazirQty: 0, arizaliQty: 0 };

                return (
                  <div key={acc.id} className="p-4 bg-purple-50/20 hover:bg-purple-50/40 transition space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-[#1E2534]">{acc.accessory?.name}</p>
                        <p className="text-[11px] text-slate-500">
                          Verilen: {acc.quantityGiven} • İade Edilmiş: {acc.quantityReturned} • <span className="font-bold text-purple-700">Kalan İade Edilebilir: {remaining} adet</span>
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                      {/* Sağlam Miktar */}
                      <div className="flex items-center justify-between p-2.5 bg-emerald-50/60 border border-emerald-200 rounded-xl">
                        <span className="text-xs font-bold text-emerald-900">Sağlam (Hazır) Miktar:</span>
                        <input
                          type="number"
                          min={0}
                          max={remaining}
                          value={state.hazirQty}
                          onChange={(e) =>
                            setAccessoryState((prev) => ({
                              ...prev,
                              [acc.accessoryId]: { ...state, hazirQty: Math.max(0, parseInt(e.target.value, 10) || 0) },
                            }))
                          }
                          className="w-20 px-2.5 py-1 rounded-lg border border-emerald-300 bg-white text-xs font-bold text-slate-800 text-center"
                        />
                      </div>

                      {/* Arızalı Miktar */}
                      <div className="flex items-center justify-between p-2.5 bg-rose-50/60 border border-rose-200 rounded-xl">
                        <span className="text-xs font-bold text-rose-900">Arızalı Miktar:</span>
                        <input
                          type="number"
                          min={0}
                          max={remaining}
                          value={state.arizaliQty}
                          onChange={(e) =>
                            setAccessoryState((prev) => ({
                              ...prev,
                              [acc.accessoryId]: { ...state, arizaliQty: Math.max(0, parseInt(e.target.value, 10) || 0) },
                            }))
                          }
                          className="w-20 px-2.5 py-1 rounded-lg border border-rose-300 bg-white text-xs font-bold text-slate-800 text-center"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SUBMIT ACTIONS */}
        {(() => {
          const pendingServiceHardware = Object.keys(hardwareState).find((hwId) => {
            const state = hardwareState[hwId];
            return state.selected && state.resultStatus === 'Serviste' && !maintenanceCompletedForIds.has(hwId);
          });
          const isSubmitDisabled = submitting || Boolean(pendingServiceHardware);

          return (
            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-4">
              <button
                type="button"
                onClick={handleCancelReturn}
                className="px-5 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 transition cursor-pointer"
              >
                İptal
              </button>
              <div className="flex flex-col items-end gap-1.5">
                <button
                  type="submit"
                  disabled={isSubmitDisabled}
                  className="px-6 py-2.5 rounded-xl bg-[#1E2534] text-white text-xs font-bold hover:bg-slate-800 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-xs"
                >
                  {submitting ? 'İade Kaydediliyor...' : 'İadeyi Onayla ve PDF Oluştur'}
                </button>
                {pendingServiceHardware && (
                  <p className="text-[11px] font-semibold text-rose-600">
                    * Serviste olarak işaretlenen varlıklar için önce bakım kaydı oluşturulmalıdır
                  </p>
                )}
              </div>
            </div>
          );
        })()}
      </form>

      <PendingMaintenanceFormModal
        isOpen={isMaintenanceModalOpen}
        onClose={handlePendingMaintenanceClose}
        onSave={handlePendingMaintenanceSave}
        hardwareName={selectedHardwareForMaintenance?.name || ''}
      />
    </div>
  );
}
