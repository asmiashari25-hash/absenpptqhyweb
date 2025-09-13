import React, { useState, useMemo, useEffect, useCallback, FC, FormEvent, useRef } from 'react';
import { Santri, Pembina, Kelas, Kegiatan, Pelanggaran, Kesehatan, User, Section, DataTab, ReportTab, QuickModalType, UserRole, StatusAbsensi, JenisPelanggaran, AbsensiRecord, AdminData } from './types';
import { 
    INITIAL_JENIS_PELANGGARAN_DATA,
    SANTRI_UPLOAD_HEADERS, PEMBINA_UPLOAD_HEADERS
} from './constants';
import { useToast } from './hooks/useToast';
import { downloadSantriTemplate, exportToExcel, importFromExcel, downloadPembinaTemplate } from './services/exportService';
import * as apiService from './services/apiService';
import { Icon } from './components/icons';


// --- AI INITIALIZATION (REMOVED FROM CLIENT-SIDE) ---
// The GoogleGenAI client is now initialized on the server-side (Vercel Serverless Function).


// --- HELPER & GENERIC UI COMPONENTS ---

const ModernButton: FC<React.PropsWithChildren<{ onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void; type?: 'button' | 'submit'; className?: string, disabled?: boolean }>> = ({ children, onClick, type = 'button', className = '', disabled = false }) => (
    <button
        type={type}
        onClick={onClick}
        disabled={disabled}
        className={`group relative overflow-hidden transition-all duration-300 ease-in-out transform hover:-translate-y-0.5 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 text-white font-semibold py-3 px-6 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none ${className}`}
    >
        <span className="relative z-10 flex items-center justify-center">{children}</span>
        <span className="absolute top-0 left-[-100%] w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-all duration-500 group-hover:left-[100%]"></span>
    </button>
);

const GlassCard: FC<React.PropsWithChildren<{ className?: string }>> = ({ children, className }) => (
    <div className={`bg-white/80 backdrop-blur-2xl border border-white/30 rounded-3xl shadow-lg p-4 md:p-8 transition-all duration-300 hover:shadow-2xl hover:-translate-y-1 ${className}`}>
        {children}
    </div>
);

const Modal: FC<React.PropsWithChildren<{ isOpen: boolean; onClose: () => void; title: string, size?: 'md' | 'lg' | 'xl' }>> = ({ isOpen, onClose, title, children, size = 'md' }) => {
    if (!isOpen) return null;

    const sizeClass = {
        md: 'max-w-md',
        lg: 'max-w-2xl',
        xl: 'max-w-4xl',
    }[size];

    return (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 animate-fade-in-fast" onClick={onClose}>
            <div className={`bg-white rounded-2xl shadow-2xl w-full ${sizeClass} mx-auto max-h-[90vh] flex flex-col animate-scale-in`} onClick={e => e.stopPropagation()}>
                <div className="p-4 md:p-6 border-b border-gray-200 flex justify-between items-center">
                    <h3 className="text-lg md:text-xl font-bold text-slate-800">{title}</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <Icon name="times" className="text-xl" />
                    </button>
                </div>
                <div className="p-4 md:p-6 overflow-y-auto">
                    {children}
                </div>
            </div>
        </div>
    );
};

const FormInput = React.forwardRef<HTMLInputElement, { label: string; id: string; name?: string; type?: string; placeholder?: string; required?: boolean; defaultValue?: string | number, value?: string | number, onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void }>((props, ref) => (
    <div>
        <label htmlFor={props.id} className="block text-sm font-semibold text-slate-700 mb-2">{props.label}{props.required && <span className="text-red-500 ml-1">*</span>}</label>
        <input
            ref={ref}
            {...props}
            name={props.name || props.id}
            type={props.type || 'text'}
            className="w-full px-4 py-3 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none border-2 border-gray-200 bg-gray-50 focus:bg-white transition text-slate-800 placeholder:text-slate-400"
        />
    </div>
));

const FormSelect = React.forwardRef<HTMLSelectElement, React.PropsWithChildren<{ label: string; id: string; name?: string; required?: boolean; defaultValue?: string, value?: string, onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void }>>((props, ref) => (
     <div>
        <label htmlFor={props.id} className="block text-sm font-semibold text-slate-700 mb-2">{props.label}{props.required && <span className="text-red-500 ml-1">*</span>}</label>
        <select
            ref={ref}
            {...props}
            name={props.name || props.id}
            className="w-full px-4 py-3 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none border-2 border-gray-200 bg-gray-50 focus:bg-white transition appearance-none text-slate-800"
        >
          {props.children}
        </select>
    </div>
));

const FormTextarea = React.forwardRef<HTMLTextAreaElement, { label: string; id: string; name?: string; placeholder?: string; required?: boolean; rows?: number, value?: string, onChange?: (e: React.ChangeEvent<HTMLTextAreaElement>) => void, defaultValue?: string | number }>((props, ref) => (
    <div>
        <label htmlFor={props.id} className="block text-sm font-semibold text-slate-700 mb-2">{props.label}{props.required && <span className="text-red-500 ml-1">*</span>}</label>
        <textarea
            ref={ref}
            {...props}
            name={props.name || props.id}
            rows={props.rows || 3}
            className="w-full px-4 py-3 rounded-xl focus:ring-2 focus:ring-purple-500 focus:outline-none border-2 border-gray-200 bg-gray-50 focus:bg-white transition text-slate-800 placeholder:text-slate-400"
        />
    </div>
));


// --- AUTHENTICATION & LOADING ---

const LoadingScreen: FC<{ message?: string }> = ({ message = "Menyiapkan Data..." }) => (
    <div className="fixed inset-0 bg-gradient-to-br from-purple-500 to-indigo-600 z-[100] flex flex-col items-center justify-center text-white animate-fade-in-fast">
        <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg animate-pulse">
            <Icon name="mosque" className="text-white text-3xl" />
        </div>
        <Icon name="spinner" className="fa-spin text-4xl mb-4" />
        <p className="text-lg font-semibold tracking-wider">{message}</p>
    </div>
);

const LoginScreen: FC<{ onLogin: (user: User) => void; adminData: AdminData[]; pembinaData: Pembina[] }> = ({ onLogin, adminData, pembinaData }) => {
    const [activeTab, setActiveTab] = useState<'admin' | 'pembina'>('admin');
    const { addToast } = useToast();

    const handleAdminLogin = (e: FormEvent) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const username = (form.elements.namedItem('username') as HTMLInputElement).value;
        const password = (form.elements.namedItem('password') as HTMLInputElement).value;
        
        if (!username || !password) {
            addToast('Username dan password harus diisi!', 'error');
            return;
        }

        // Superadmin login (hardcoded as a fallback/root user)
        if (username === 'superadmin' && password === 'superadmin123') {
            onLogin({ role: 'superadmin', name: 'Super Admin', username });
            addToast('Login sebagai Super Admin berhasil!', 'success');
            return;
        }

        // Dynamic admin login from fetched data
        const foundAdmin = adminData.find(admin => admin.username === username);

        if (foundAdmin && foundAdmin.password === password) {
            onLogin({ role: 'admin', name: foundAdmin.name, username: foundAdmin.username });
            addToast(`Selamat datang, ${foundAdmin.name}!`, 'success');
        } else {
            addToast('Username atau password salah!', 'error');
        }
    };

    const handlePembinaLogin = (e: FormEvent) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const pembinaId = (form.elements.namedItem('pembina-id') as HTMLInputElement).value.trim();
        if (!pembinaId) {
            addToast('Nomor Induk Pembina harus diisi!', 'error');
            return;
        }

        const foundPembina = pembinaData.find(p => p.id_pembina === pembinaId);

        if (foundPembina) {
            onLogin({ role: 'pembina', name: foundPembina.nama, id: foundPembina.id_pembina });
            addToast(`Selamat datang, ${foundPembina.nama}!`, 'success');
        } else {
            addToast('Nomor Induk Pembina tidak ditemukan!', 'error');
        }
    };

    const tabClass = (tab: 'admin' | 'pembina') => 
        `flex-1 py-3 px-4 md:px-6 rounded-lg text-sm font-semibold transition-all duration-300 ${
            activeTab === tab 
            ? 'bg-white text-slate-800 shadow-md' 
            : 'text-slate-600 hover:text-slate-800 hover:bg-white/50'
        }`;

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-gradient-to-br from-purple-500 to-indigo-600 p-4">
            <div className="absolute inset-0 bg-cover bg-center opacity-10" style={{backgroundImage: "url('https://source.unsplash.com/random/1920x1080?mosque,pattern')"}}></div>
            <div className="bg-white/80 backdrop-blur-2xl p-6 md:p-8 rounded-3xl shadow-2xl w-full max-w-md mx-auto relative z-10 border border-white/30 animate-fade-in-fast">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br from-purple-600 to-indigo-700 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg">
                        <Icon name="mosque" className="text-white text-2xl md:text-3xl" />
                    </div>
                    <h1 className="text-2xl md:text-3xl font-bold text-slate-800">PPTQ HAQQUL YAQIN</h1>
                    <p className="text-slate-700 mt-2 md:mt-3 font-medium">Sistem Absensi Digital Modern</p>
                </div>

                <div className="flex mb-8 bg-black/5 rounded-xl p-1 backdrop-blur-sm">
                    <button onClick={() => setActiveTab('admin')} className={tabClass('admin')}>
                        <Icon name="user-shield" className="mr-2" />Admin
                    </button>
                    <button onClick={() => setActiveTab('pembina')} className={tabClass('pembina')}>
                        <Icon name="user-tie" className="mr-2" />Pembina
                    </button>
                </div>

                {activeTab === 'admin' && (
                    <form onSubmit={handleAdminLogin} className="space-y-6 animate-fade-in-fast">
                        <FormInput label="Username/Email" id="username" name="username" placeholder="Masukkan username atau email" />
                        <FormInput label="Password" id="password" name="password" type="password" placeholder="Masukkan password" />
                        <ModernButton type="submit" className="w-full bg-gradient-to-r from-purple-600 to-indigo-700">
                            <Icon name="sign-in-alt" className="mr-2" />Login Admin
                        </ModernButton>
                    </form>
                )}

                {activeTab === 'pembina' && (
                    <form onSubmit={handlePembinaLogin} className="space-y-6 animate-fade-in-fast">
                        <FormInput label="Nomor Induk Pembina" id="pembina-id" name="pembina-id" placeholder="Masukkan nomor induk" />
                         <ModernButton type="submit" className="w-full bg-gradient-to-r from-green-500 to-emerald-600">
                            <Icon name="user-check" className="mr-2" />Login Pembina
                        </ModernButton>
                    </form>
                )}
            </div>
        </div>
    );
};

// --- DATABASE CONNECTION STATUS ---
type ConnectionStatus = 'connecting' | 'connected' | 'error';

const ConnectionStatusIndicator: FC<{ status: ConnectionStatus, onClick?: () => void }> = ({ status, onClick }) => {
    const statusMap = {
        connecting: { icon: 'spinner', spin: true, color: 'bg-yellow-500', tooltip: 'Menghubungkan ke database...' },
        connected: { icon: 'check', spin: false, color: 'bg-green-500', tooltip: 'Database terhubung' },
        error: { icon: 'exclamation-triangle', spin: false, color: 'bg-red-500', tooltip: 'Koneksi database gagal. Klik untuk detail.' },
    };

    const { icon, spin, color, tooltip } = statusMap[status];

    return (
        <div className="relative group">
            <button 
                onClick={onClick} 
                className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-xs transition-all duration-300 shadow-md ${color} ${status === 'error' ? 'cursor-pointer hover:scale-110' : 'cursor-default'}`}
                aria-label={tooltip}
            >
                <Icon name={icon} className={spin ? 'fa-spin' : ''} />
            </button>
            <div className="absolute bottom-full mb-2 right-1/2 translate-x-1/2 w-max bg-slate-800 text-white text-xs font-semibold px-3 py-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-50">
                {tooltip}
            </div>
        </div>
    );
};


// --- LAYOUT COMPONENTS ---

const Header: FC<{ user: User; onLogout: () => void; onToggleSidebar: () => void; connectionStatus: ConnectionStatus; onConnectionStatusClick: () => void; }> = ({ user, onLogout, onToggleSidebar, connectionStatus, onConnectionStatusClick }) => (
    <header className="bg-white/80 backdrop-blur-2xl shadow-lg border-b border-white/30 sticky top-0 z-30">
        <div className="flex items-center justify-between px-4 md:px-6 py-4">
            <div className="flex items-center space-x-2 md:space-x-4">
                <button onClick={onToggleSidebar} className="lg:hidden text-slate-700 hover:text-slate-900 p-2 rounded-xl hover:bg-gray-200/50 transition">
                    <Icon name="bars" className="text-xl" />
                </button>
                <div className="flex items-center space-x-2 md:space-x-4">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-gradient-to-br from-purple-600 to-indigo-700 rounded-xl md:rounded-2xl flex items-center justify-center shadow-md">
                        <Icon name="mosque" className="text-white text-md md:text-lg" />
                    </div>
                    <div>
                        <h1 className="text-md md:text-xl font-bold text-slate-800">PPTQ HAQQUL YAQIN</h1>
                        <p className="hidden sm:block text-xs md:text-sm text-slate-600 font-medium">Sistem Absensi Digital</p>
                    </div>
                </div>
            </div>
            <div className="flex items-center space-x-2 md:space-x-4">
                 <ConnectionStatusIndicator status={connectionStatus} onClick={onConnectionStatusClick} />
                <div className="text-right hidden sm:block">
                    <p className="text-sm font-semibold text-slate-800">{user.name}</p>
                    <p className="text-xs text-slate-600 font-medium capitalize">{user.role === 'superadmin' ? 'Super Admin' : user.role}</p>
                </div>
                <button onClick={onLogout} className="text-slate-600 hover:text-red-600 p-2 md:p-3 rounded-xl hover:bg-red-100 transition-all duration-300 shadow-sm hover:shadow-md">
                    <Icon name="sign-out-alt" className="text-lg" />
                </button>
            </div>
        </div>
    </header>
);

const Sidebar: FC<{ activeSection: Section; onNavigate: (section: Section) => void; userRole: UserRole }> = ({ activeSection, onNavigate, userRole }) => {
    const navItems = [
        { id: 'dashboard', name: 'Dashboard', icon: 'tachometer-alt', gradient: 'from-blue-500 to-purple-600', allowedRoles: ['admin', 'pembina', 'superadmin'] },
        { id: 'absensi', name: 'Absensi', icon: 'user-check', gradient: 'from-green-500 to-emerald-600', allowedRoles: ['admin', 'pembina', 'superadmin'] },
        { id: 'laporan', name: 'Laporan', icon: 'chart-bar', gradient: 'from-orange-500 to-red-600', allowedRoles: ['admin', 'pembina', 'superadmin'] },
        { id: 'manajemen', name: 'Manajemen Data', icon: 'cogs', gradient: 'from-purple-500 to-pink-600', allowedRoles: ['admin', 'superadmin'] },
        { id: 'pembinaan', name: 'Pembinaan', icon: 'clipboard-list', gradient: 'from-teal-500 to-cyan-600', allowedRoles: ['admin', 'pembina', 'superadmin'] },
    ].filter(item => item.allowedRoles.includes(userRole));

    const navItemClass = (id: Section, gradient: string) => `group relative flex items-center px-6 py-4 text-slate-700 rounded-2xl transition-all duration-300 hover:text-white ${
        activeSection === id ? `text-white bg-gradient-to-r shadow-lg ${gradient}` : 'hover:bg-gradient-to-r hover:from-slate-700 hover:to-slate-800'
    }`;

    return (
        <nav className="mt-8 px-4 md:px-6 space-y-3">
            {navItems.map(item => (
                <a
                    key={item.id}
                    href="#"
                    onClick={(e) => { e.preventDefault(); onNavigate(item.id as Section); }}
                    className={navItemClass(item.id as Section, item.gradient)}
                >
                    <Icon name={item.icon} className="mr-4 text-lg w-6 text-center" />
                    <span className="font-semibold">{item.name}</span>
                    <span className="absolute right-0 top-0 h-full w-1 bg-purple-500 rounded-l-lg transform scale-y-0 group-hover:scale-y-100 transition-transform duration-300"
                        style={{ display: activeSection === item.id ? 'block' : 'none' }}
                    ></span>
                </a>
            ))}
        </nav>
    );
};


// --- DASHBOARD COMPONENTS ---

const StatCard: FC<{ title: string; value: string | number; icon: string; gradient: string }> = ({ title, value, icon, gradient }) => (
    <GlassCard className="transition-all duration-300 hover:scale-105">
        <div className="flex items-center justify-between">
            <div>
                <p className="text-sm font-semibold text-slate-600 mb-2">{title}</p>
                <p className="text-3xl md:text-4xl font-bold text-slate-800">{value}</p>
            </div>
            <div className={`w-14 h-14 md:w-16 md:h-16 ${gradient} rounded-2xl flex items-center justify-center shadow-lg`}>
                <Icon name={icon} className="text-xl md:text-2xl text-white" />
            </div>
        </div>
    </GlassCard>
);

const Dashboard: FC<{ 
    santriData: Santri[]; 
    kegiatanData: Kegiatan[]; 
    absensiHistory: AbsensiRecord[];
    onStartAbsensi: (kegiatan: Kegiatan) => void;
}> = ({ santriData, kegiatanData, absensiHistory, onStartAbsensi }) => {
    
    const [todayActivities, setTodayActivities] = useState<Kegiatan[]>([]);

    const refreshTodayActivities = useCallback(() => {
        const dayNames = ['minggu', 'senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu'];
        const currentDay = dayNames[new Date().getDay()];
        
        const filtered = kegiatanData.filter(k => 
            k.status === 'aktif' && k.hari_aktif.includes(currentDay)
        ).sort((a,b) => a.jam_mulai.localeCompare(b.jam_mulai));

        setTodayActivities(filtered);
    }, [kegiatanData]);

    useEffect(() => {
        refreshTodayActivities();
    }, [refreshTodayActivities]);

    const getKegiatanIcon = (nama: string) => {
        if (nama.toLowerCase().includes('sholat')) return 'pray';
        if (nama.toLowerCase().includes('mengaji')) return 'book-open';
        return 'clock';
    };
    
    const todayString = new Date().toISOString().split('T')[0];
    const todayAbsensi = absensiHistory.filter(rec => rec.tanggal === todayString);
    const totalSantri = santriData.length;
    const hadirHariIni = new Set(todayAbsensi.filter(s => s.status === 'hadir').map(s => s.santri_id)).size;
    const tidakHadir = new Set(todayAbsensi.filter(s => s.status === 'tidak').map(s => s.santri_id)).size;
    const izinSakit = new Set(todayAbsensi.filter(s => s.status === 'izin').map(s => s.santri_id)).size;


    return (
        <div className="space-y-6 md:space-y-8 animate-fade-in">
            <div>
                <h2 className="text-2xl md:text-3xl font-bold text-slate-800">Dashboard</h2>
                <p className="text-slate-600">Ringkasan aktivitas hari ini.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                <StatCard title="Total Santri" value={totalSantri} icon="users" gradient="bg-gradient-to-br from-blue-500 to-indigo-600" />
                <StatCard title="Hadir Hari Ini" value={hadirHariIni} icon="check-circle" gradient="bg-gradient-to-br from-green-500 to-emerald-600" />
                <StatCard title="Tidak Hadir" value={tidakHadir} icon="times-circle" gradient="bg-gradient-to-br from-red-500 to-pink-600" />
                <StatCard title="Izin/Sakit" value={izinSakit} icon="exclamation-circle" gradient="bg-gradient-to-br from-yellow-500 to-orange-600" />
            </div>

            <GlassCard>
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl md:text-2xl font-bold text-slate-800">Kegiatan Hari Ini</h3>
                    <button onClick={refreshTodayActivities} className="text-slate-600 hover:text-slate-900 transition flex items-center space-x-2 font-semibold text-sm">
                        <Icon name="sync-alt" />
                        <span>Refresh</span>
                    </button>
                </div>
                <div className="space-y-4">
                    {todayActivities.length > 0 ? todayActivities.map(kegiatan => (
                        <div key={kegiatan.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-white/50 rounded-2xl shadow-sm hover:shadow-md transition-shadow gap-4">
                            <div className="flex items-center space-x-4">
                                <div className="w-14 h-14 bg-gradient-to-br from-purple-600 to-indigo-700 rounded-2xl flex items-center justify-center shadow-md flex-shrink-0">
                                    <Icon name={getKegiatanIcon(kegiatan.nama)} className="text-white text-xl" />
                                </div>
                                <div>
                                    <p className="font-bold text-slate-800 text-md md:text-lg">{kegiatan.nama}</p>
                                    <p className="text-sm text-slate-600 font-medium">{kegiatan.jam_mulai} - {kegiatan.jam_selesai}</p>
                                </div>
                            </div>
                            <ModernButton onClick={() => onStartAbsensi(kegiatan)} className="bg-gradient-to-r from-green-500 to-emerald-600 w-full sm:w-auto !py-2.5 !px-5 text-sm">
                                <Icon name="play" className="mr-2" />Mulai Absen
                            </ModernButton>
                        </div>
                    )) : (
                        <p className="text-center text-slate-500 py-8">Tidak ada kegiatan terjadwal untuk hari ini.</p>
                    )}
                </div>
            </GlassCard>
        </div>
    );
};

// --- ABSENSI COMPONENT ---

const Absensi: FC<{
    santriData: Santri[];
    kelasData: Kelas[];
    kegiatanData: Kegiatan[];
    currentKegiatan: Kegiatan | null;
    onMarkAttendance: (santriId: number, status: 'hadir' | 'tidak' | 'izin' | 'terlambat', keterangan?: string) => void;
    onChangeKegiatan: (kegiatan: Kegiatan | null) => void;
    onResetAbsensi: () => void;
}> = ({ santriData, kelasData, kegiatanData, currentKegiatan, onMarkAttendance, onChangeKegiatan, onResetAbsensi }) => {
    
    const [searchQuery, setSearchQuery] = useState('');
    const [kelasFilter, setKelasFilter] = useState('');
    const [isAbsensiLocked, setIsAbsensiLocked] = useState(false);
    const { addToast } = useToast();
    const [modalState, setModalState] = useState<{
        isOpen: boolean;
        santri: Santri | null;
        status: 'hadir' | 'tidak' | 'izin' | 'terlambat' | null
    }>({ isOpen: false, santri: null, status: null });


    const filteredSantri = useMemo(() => {
        return santriData.filter(santri => {
            const searchMatch = searchQuery.trim() === '' ||
                santri.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
                santri.nomor_induk.toLowerCase().includes(searchQuery.toLowerCase());
            const kelasMatch = kelasFilter === '' || santri.kelas === kelasFilter;
            return searchMatch && kelasMatch;
        });
    }, [santriData, searchQuery, kelasFilter]);

    const handleKegiatanChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const kegiatanId = e.target.value;
        setIsAbsensiLocked(false);
        if (!kegiatanId) {
            onChangeKegiatan(null);
            return;
        }
        const selectedKegiatan = kegiatanData.find(k => k.id.toString() === kegiatanId);
        if (selectedKegiatan) {
             onChangeKegiatan(selectedKegiatan);
             onResetAbsensi();
        }
    };

    const handleSelesaiAbsensi = () => {
        setIsAbsensiLocked(true);
        addToast('Absensi untuk kegiatan ini telah selesai dan dikunci.', 'success');
    };

    const openConfirmationModal = (santri: Santri, status: 'hadir' | 'tidak' | 'izin' | 'terlambat') => {
        setModalState({ isOpen: true, santri, status });
    };

    const handleAbsensiSubmit = (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const keterangan = (e.currentTarget.elements.namedItem('keterangan') as HTMLTextAreaElement).value;
        if (modalState.santri && modalState.status) {
            onMarkAttendance(modalState.santri.id, modalState.status, keterangan);
        }
        setModalState({ isOpen: false, santri: null, status: null });
    };

    const getStatusComponent = (status: Santri['status']) => {
        if (status === 'hadir') {
            return <span className="px-3 py-1.5 text-xs font-bold rounded-full bg-gradient-to-r from-green-400 to-emerald-500 text-white">Hadir</span>;
        }
        if (status === 'tidak') {
            return <span className="px-3 py-1.5 text-xs font-bold rounded-full bg-gradient-to-r from-red-400 to-pink-500 text-white">Tidak Hadir</span>;
        }
        if (status === 'izin') {
            return <span className="px-3 py-1.5 text-xs font-bold rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 text-orange-900">Izin</span>;
        }
        if (status === 'terlambat') {
            return <span className="px-3 py-1.5 text-xs font-bold rounded-full bg-gradient-to-r from-purple-400 to-fuchsia-500 text-white">Terlambat</span>;
        }
        return <span className="px-3 py-1.5 text-xs font-bold rounded-full bg-gradient-to-r from-gray-400 to-gray-500 text-white">Belum Absen</span>;
    };

    return (
        <div className="space-y-6 md:space-y-8 animate-fade-in">
            <div>
                <h2 className="text-2xl md:text-3xl font-bold text-slate-800">Absensi</h2>
                <p className="text-slate-600">Kelola absensi santri untuk kegiatan hari ini.</p>
            </div>

            <GlassCard>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
                    <FormSelect label="Kegiatan" id="kegiatan-select" value={currentKegiatan?.id.toString() || ''} onChange={handleKegiatanChange}>
                        <option value="">Pilih Kegiatan</option>
                        {kegiatanData.map(k => <option key={k.id} value={k.id}>{k.nama}</option>)}
                    </FormSelect>
                    <FormSelect label="Filter Kelas" id="kelas-filter" value={kelasFilter} onChange={(e) => setKelasFilter(e.target.value)}>
                        <option value="">Semua Kelas</option>
                        {kelasData.map(k => <option key={k.id} value={k.nama_kelas}>{k.nama_kelas}</option>)}
                    </FormSelect>
                    <FormInput label="Cari Santri" id="search-santri" placeholder="Ketik nama atau no. induk..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                </div>
                 {currentKegiatan && !isAbsensiLocked && (
                    <div className="mt-4 flex justify-end">
                        <ModernButton onClick={handleSelesaiAbsensi} className="bg-gradient-to-r from-blue-500 to-cyan-600">
                            <Icon name="lock" className="mr-2" /> Selesai Absensi
                        </ModernButton>
                    </div>
                )}
            </GlassCard>

            <GlassCard>
                <h3 className="text-xl md:text-2xl font-bold text-slate-800 mb-6">Daftar Santri</h3>
                
                {isAbsensiLocked && (
                    <div className="bg-blue-100 border-l-4 border-blue-500 text-blue-800 p-4 rounded-lg mb-6 flex items-center gap-4 animate-fade-in-fast">
                        <Icon name="lock" className="text-2xl" />
                        <div>
                            <p className="font-bold">Absensi Selesai</p>
                            <p className="text-sm">Data absensi untuk kegiatan ini telah dikunci dan tidak dapat diubah. Pilih kegiatan lain untuk memulai absensi baru.</p>
                        </div>
                    </div>
                )}

                {/* Desktop Table View */}
                <div className="overflow-x-auto hidden md:block">
                    <table className="w-full">
                        <thead className="bg-gray-100/50">
                            <tr>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Santri</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Kelas</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Waktu</th>
                                <th className="px-6 py-4 text-left text-xs font-bold text-slate-600 uppercase tracking-wider">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200/50">
                            {filteredSantri.map(santri => (
                                <tr key={santri.id} className="hover:bg-gray-100/50 transition-colors">
                                    <td className="px-6 py-5 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center mr-4 shadow flex-shrink-0">
                                                <span className="text-white font-bold text-lg">{santri.nama.charAt(0)}</span>
                                            </div>
                                            <div>
                                                <div className="text-sm font-semibold text-slate-900">{santri.nama}</div>
                                                <div className="text-sm text-slate-600 font-medium">{santri.nomor_induk}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 whitespace-nowrap text-sm font-semibold text-slate-800">{santri.kelas}</td>
                                    <td className="px-6 py-5 whitespace-nowrap">{getStatusComponent(santri.status)}</td>
                                    <td className="px-6 py-5 whitespace-nowrap text-sm font-medium text-slate-600">{santri.waktu || '-'}</td>
                                    <td className="px-6 py-5 whitespace-nowrap text-sm space-x-2">
                                        <button disabled={isAbsensiLocked} title="Hadir" onClick={() => openConfirmationModal(santri, 'hadir')} className="bg-green-500 text-white w-10 h-10 rounded-lg hover:bg-green-600 transition shadow hover:shadow-md transform hover:-translate-y-0.5 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:hover:bg-green-500"><Icon name="check" /></button>
                                        <button disabled={isAbsensiLocked} title="Tidak Hadir" onClick={() => openConfirmationModal(santri, 'tidak')} className="bg-red-500 text-white w-10 h-10 rounded-lg hover:bg-red-600 transition shadow hover:shadow-md transform hover:-translate-y-0.5 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:hover:bg-red-500"><Icon name="times" /></button>
                                        <button disabled={isAbsensiLocked} title="Izin" onClick={() => openConfirmationModal(santri, 'izin')} className="bg-yellow-500 text-yellow-900 w-10 h-10 rounded-lg hover:bg-yellow-600 transition shadow hover:shadow-md transform hover:-translate-y-0.5 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:hover:bg-yellow-500"><Icon name="exclamation" /></button>
                                        <button disabled={isAbsensiLocked} title="Terlambat" onClick={() => openConfirmationModal(santri, 'terlambat')} className="bg-purple-500 text-white w-10 h-10 rounded-lg hover:bg-purple-600 transition shadow hover:shadow-md transform hover:-translate-y-0.5 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:hover:bg-purple-500"><Icon name="clock" /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card View */}
                <div className="space-y-4 md:hidden">
                    {filteredSantri.map(santri => (
                        <div key={santri.id} className="bg-white/60 p-4 rounded-2xl shadow-md">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center flex-shrink-0">
                                        <span className="text-white font-bold">{santri.nama.charAt(0)}</span>
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-800">{santri.nama}</p>
                                        <p className="text-xs text-slate-600">{santri.nomor_induk} &bull; Kelas {santri.kelas}</p>
                                    </div>
                                </div>
                                {getStatusComponent(santri.status)}
                            </div>
                            <div className="border-t my-3"></div>
                            <div className="flex justify-between items-center">
                                <p className="text-xs text-slate-500 font-medium">Waktu: {santri.waktu || '-'}</p>
                                <div className="space-x-2">
                                    <button disabled={isAbsensiLocked} title="Hadir" onClick={() => openConfirmationModal(santri, 'hadir')} className="bg-green-500 text-white w-8 h-8 rounded-lg hover:bg-green-600 transition disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-green-500"><Icon name="check" /></button>
                                    <button disabled={isAbsensiLocked} title="Tidak Hadir" onClick={() => openConfirmationModal(santri, 'tidak')} className="bg-red-500 text-white w-8 h-8 rounded-lg hover:bg-red-600 transition disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-red-500"><Icon name="times" /></button>
                                    <button disabled={isAbsensiLocked} title="Izin" onClick={() => openConfirmationModal(santri, 'izin')} className="bg-yellow-500 text-yellow-900 w-8 h-8 rounded-lg hover:bg-yellow-600 transition disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-yellow-500"><Icon name="exclamation" /></button>
                                    <button disabled={isAbsensiLocked} title="Terlambat" onClick={() => openConfirmationModal(santri, 'terlambat')} className="bg-purple-500 text-white w-8 h-8 rounded-lg hover:bg-purple-600 transition disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-purple-500"><Icon name="clock" /></button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </GlassCard>

            <Modal isOpen={modalState.isOpen} onClose={() => setModalState({ isOpen: false, santri: null, status: null })} title={`Konfirmasi Absensi: ${modalState.santri?.nama}`}>
                <form onSubmit={handleAbsensiSubmit}>
                    <p className="mb-4">
                        Tandai status sebagai: 
                        <span className="font-bold ml-2 capitalize">{modalState.status}</span>
                    </p>
                    <FormTextarea 
                        label="Keterangan (Opsional)" 
                        id="keterangan" 
                        name="keterangan"
                        placeholder="Contoh: Terlambat karena ada urusan keluarga." 
                    />
                    <div className="flex justify-end mt-6 space-x-3">
                         <button type="button" onClick={() => setModalState({ isOpen: false, santri: null, status: null })} className="px-6 py-3 font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition">
                            Batal
                        </button>
                        <ModernButton type="submit" className="bg-gradient-to-r from-green-500 to-emerald-600">
                            Simpan Absensi
                        </ModernButton>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

// --- LAPORAN COMPONENT ---
const getWeekRange = (dateStr: string) => {
    if (!dateStr) return { start: '', end: '' };
    
    const date = new Date(dateStr + 'T00:00:00'); // Ensure timezone consistency
    const day = date.getDay();
    const diff = date.getDate() - day + (day === 0 ? -6 : 1); // Adjust when day is Sunday
    const firstDayOfWeek = new Date(date.setDate(diff));

    const lastDayOfWeek = new Date(firstDayOfWeek);
    lastDayOfWeek.setDate(lastDayOfWeek.getDate() + 6);
    
    return {
        start: firstDayOfWeek.toISOString().slice(0, 10),
        end: lastDayOfWeek.toISOString().slice(0, 10)
    };
};


const Laporan: FC<{
    santriData: Santri[];
    absensiHistory: AbsensiRecord[];
    kelasData: Kelas[];
    pelanggaranData: Pelanggaran[];
    kesehatanData: Kesehatan[];
    onGenerateAiSummary: (data: any[], reportType: ReportTab) => void;
}> = ({ santriData, absensiHistory, kelasData, pelanggaranData, kesehatanData, onGenerateAiSummary }) => {
    const [activeTab, setActiveTab] = useState<ReportTab>('absensi');
    const [reportPeriod, setReportPeriod] = useState<'harian' | 'mingguan' | 'bulanan'>('harian');
    const [dateFilter, setDateFilter] = useState(new Date().toISOString().split('T')[0]);
    const [monthFilter, setMonthFilter] = useState(new Date().toISOString().slice(0, 7)); // YYYY-MM
    const [kelasFilter, setKelasFilter] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [searchFilter, setSearchFilter] = useState('');

    const santriKelasMap = useMemo(() => {
        const map = new Map<number, string>();
        santriData.forEach(s => map.set(s.id, s.kelas));
        return map;
    }, [santriData]);

    const dateFilterLogic = useCallback((recordDate: string) => {
        if (reportPeriod === 'harian') {
            return !dateFilter || recordDate === dateFilter;
        } else if (reportPeriod === 'mingguan') {
            if (!dateFilter) return true;
            const { start, end } = getWeekRange(dateFilter);
            return recordDate >= start && recordDate <= end;
        } else if (reportPeriod === 'bulanan') {
            return !monthFilter || recordDate.startsWith(monthFilter);
        }
        return false;
    }, [reportPeriod, dateFilter, monthFilter]);

    const filteredAbsensiData = useMemo(() => {
        return absensiHistory.filter(rec => {
            const dateMatch = dateFilterLogic(rec.tanggal);
            const kelasMatch = !kelasFilter || rec.kelas === kelasFilter;
            const statusMatch = !statusFilter || rec.status === statusFilter;
            const searchMatch = !searchFilter || rec.santri_nama.toLowerCase().includes(searchFilter.toLowerCase());
            return dateMatch && kelasMatch && statusMatch && searchMatch;
        });
    }, [absensiHistory, dateFilterLogic, kelasFilter, statusFilter, searchFilter]);

    const filteredPelanggaranData = useMemo(() => {
        return pelanggaranData.filter(p => {
            const dateMatch = dateFilterLogic(p.tanggal);
            const kelasMatch = !kelasFilter || santriKelasMap.get(p.santri_id) === kelasFilter;
            const searchMatch = !searchFilter || p.santri_nama.toLowerCase().includes(searchFilter.toLowerCase());
            return dateMatch && kelasMatch && searchMatch;
        });
    }, [pelanggaranData, dateFilterLogic, kelasFilter, searchFilter, santriKelasMap]);

    const filteredKesehatanData = useMemo(() => {
        return kesehatanData.filter(k => {
            const dateMatch = dateFilterLogic(k.tanggal);
            const kelasMatch = !kelasFilter || santriKelasMap.get(k.santri_id) === kelasFilter;
            const searchMatch = !searchFilter || k.santri_nama.toLowerCase().includes(searchFilter.toLowerCase());
            return dateMatch && kelasMatch && searchMatch;
        });
    }, [kesehatanData, dateFilterLogic, kelasFilter, searchFilter, santriKelasMap]);

    const selectedWeekRange = useMemo(() => {
        if (reportPeriod !== 'mingguan' || !dateFilter) return '';
        const { start, end } = getWeekRange(dateFilter);
        return `${start} s/d ${end}`;
    }, [dateFilter, reportPeriod]);
    
    const TabButton: FC<{tab: ReportTab, children: React.ReactNode}> = ({ tab, children }) => (
      <button
        onClick={() => setActiveTab(tab)}
        className={`px-3 md:px-4 py-3 font-semibold transition-colors duration-300 relative text-sm md:text-base ${
            activeTab === tab 
            ? 'text-purple-600' 
            : 'text-slate-500 hover:text-slate-800'
        }`}
      >
        {children}
        {activeTab === tab && <span className="absolute bottom-0 left-0 w-full h-0.5 bg-purple-600 rounded-full animate-fade-in-fast"></span>}
      </button>
    );

    const PeriodButton: FC<{period: typeof reportPeriod, children: React.ReactNode}> = ({ period, children }) => (
      <button
        onClick={() => setReportPeriod(period)}
        className={`px-3 py-1.5 text-sm font-semibold rounded-md transition-all ${reportPeriod === period ? 'bg-indigo-600 text-white shadow' : 'text-slate-500 hover:bg-indigo-100'}`}
      >
        {children}
      </button>
    );

    const renderContent = () => {
        switch(activeTab) {
            case 'pelanggaran':
                return (
                    <div className="space-y-6 animate-fade-in-fast">
                        <GlassCard>
                             <div className="flex flex-col sm:flex-row gap-4 justify-between items-center mb-4">
                                <h3 className="text-lg md:text-xl font-bold text-slate-800">Laporan Pelanggaran</h3>
                                <div className="flex gap-2 w-full sm:w-auto flex-col sm:flex-row">
                                    <ModernButton onClick={() => onGenerateAiSummary(filteredPelanggaranData, 'pelanggaran')} className="bg-gradient-to-r from-blue-500 to-cyan-600 !py-2.5 !px-5 text-sm w-full sm:w-auto" disabled={filteredPelanggaranData.length === 0}>
                                        <Icon name="magic" className="mr-2"/> Buat Ringkasan AI
                                    </ModernButton>
                                    <ModernButton onClick={() => exportToExcel(filteredPelanggaranData, 'laporan_pelanggaran', 'Pelanggaran')} className="bg-gradient-to-r from-green-500 to-emerald-600 !py-2.5 !px-5 text-sm w-full sm:w-auto" disabled={filteredPelanggaranData.length === 0}>
                                        <Icon name="file-excel" className="mr-2"/> Export
                                    </ModernButton>
                                </div>
                            </div>
                         <div className="overflow-x-auto hidden md:block">
                            <table className="w-full">
                                <thead className="bg-slate-100/80">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Santri</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Jenis Pelanggaran</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Tanggal</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Pembina Pelapor</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredPelanggaranData.length > 0 ? filteredPelanggaranData.map((p, index) => (
                                        <tr key={p.id} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-semibold">{p.santri_nama}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{p.jenis}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{p.tanggal}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{p.pembina}</td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan={4} className="text-center py-10 text-slate-500">Tidak ada data ditemukan.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div className="space-y-4 md:hidden">
                            {filteredPelanggaranData.map(p => (
                                <div key={p.id} className="bg-white/60 p-4 rounded-xl shadow">
                                    <p className="font-bold text-slate-800">{p.santri_nama}</p>
                                    <p className="text-sm text-red-600 font-semibold capitalize">{p.jenis}</p>
                                    <div className="border-t my-2"></div>
                                    <p className="text-xs text-slate-500"><Icon name="calendar-alt" className="mr-1"/> {p.tanggal}</p>
                                    <p className="text-xs text-slate-500"><Icon name="user-tie" className="mr-1"/> {p.pembina}</p>
                                </div>
                            ))}
                        </div>
                        </GlassCard>
                    </div>
                );
            case 'kesehatan':
                 return (
                    <div className="space-y-6 animate-fade-in-fast">
                         <GlassCard>
                            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center mb-4">
                                <h3 className="text-lg md:text-xl font-bold text-slate-800">Laporan Kesehatan</h3>
                                <div className="flex gap-2 w-full sm:w-auto flex-col sm:flex-row">
                                    <ModernButton onClick={() => onGenerateAiSummary(filteredKesehatanData, 'kesehatan')} className="bg-gradient-to-r from-blue-500 to-cyan-600 !py-2.5 !px-5 text-sm w-full sm:w-auto" disabled={filteredKesehatanData.length === 0}>
                                        <Icon name="magic" className="mr-2"/> Buat Ringkasan AI
                                    </ModernButton>
                                    <ModernButton onClick={() => exportToExcel(filteredKesehatanData, 'laporan_kesehatan', 'Kesehatan')} className="bg-gradient-to-r from-green-500 to-emerald-600 !py-2.5 !px-5 text-sm w-full sm:w-auto" disabled={filteredKesehatanData.length === 0}>
                                        <Icon name="file-excel" className="mr-2"/> Export
                                    </ModernButton>
                                </div>
                            </div>
                         <div className="overflow-x-auto hidden md:block">
                            <table className="w-full">
                                <thead className="bg-slate-100/80">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Santri</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Status</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Tanggal</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Catatan</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Pembina Pelapor</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredKesehatanData.length > 0 ? filteredKesehatanData.map((k, index) => (
                                        <tr key={k.id} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-semibold">{k.santri_nama}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 capitalize">{k.status}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{k.tanggal}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{k.catatan}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{k.pembina}</td>
                                        </tr>
                                    )) : (
                                        <tr><td colSpan={5} className="text-center py-10 text-slate-500">Tidak ada data ditemukan.</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                        <div className="space-y-4 md:hidden">
                            {filteredKesehatanData.map(k => (
                                <div key={k.id} className="bg-white/60 p-4 rounded-xl shadow">
                                    <div className="flex justify-between items-start">
                                        <p className="font-bold text-slate-800">{k.santri_nama}</p>
                                        <span className={`px-2 py-1 text-xs font-bold rounded-full text-white capitalize ${k.status === 'sakit' ? 'bg-orange-500' : 'bg-green-500'}`}>{k.status}</span>
                                    </div>
                                    <p className="text-sm text-slate-600 mt-1">{k.catatan}</p>
                                    <div className="border-t my-2"></div>
                                    <p className="text-xs text-slate-500"><Icon name="calendar-alt" className="mr-1"/> {k.tanggal}</p>
                                    <p className="text-xs text-slate-500"><Icon name="user-tie" className="mr-1"/> {k.pembina}</p>
                                </div>
                            ))}
                        </div>
                        </GlassCard>
                    </div>
                );
            case 'absensi':
            default:
                return (
                    <div className="space-y-6 animate-fade-in-fast">
                        <GlassCard>
                            <div className="flex flex-col sm:flex-row gap-4 justify-between items-center mb-4">
                                <h3 className="text-lg md:text-xl font-bold text-slate-800">Detail Laporan Absensi</h3>
                                <div className="flex gap-2 w-full sm:w-auto flex-col sm:flex-row">
                                    <ModernButton onClick={() => onGenerateAiSummary(filteredAbsensiData, 'absensi')} className="bg-gradient-to-r from-blue-500 to-cyan-600 !py-2.5 !px-5 text-sm w-full sm:w-auto" disabled={filteredAbsensiData.length === 0}>
                                        <Icon name="magic" className="mr-2"/> Buat Ringkasan AI
                                    </ModernButton>
                                    <ModernButton onClick={() => exportToExcel(filteredAbsensiData, 'laporan_absensi', 'Absensi')} className="bg-gradient-to-r from-green-500 to-emerald-600 !py-2.5 !px-5 text-sm w-full sm:w-auto" disabled={filteredAbsensiData.length === 0}>
                                        <Icon name="file-excel" className="mr-2"/> Export Data Terfilter
                                    </ModernButton>
                                </div>
                            </div>
                            <p className="text-sm font-semibold text-slate-600 mb-4">Menampilkan {filteredAbsensiData.length} data.</p>
                            <div className="overflow-x-auto hidden md:block">
                                <table className="w-full">
                                    <thead className="bg-slate-100/80">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Santri</th>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Kelas</th>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Status</th>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Waktu</th>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Kegiatan</th>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Tanggal</th>
                                            <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Keterangan</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredAbsensiData.length > 0 ? filteredAbsensiData.map((rec, index) => (
                                            <tr key={rec.id} className={index % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'}>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-semibold">{rec.santri_nama}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{rec.kelas}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 capitalize">{rec.status}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{rec.waktu}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{rec.kegiatan}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{rec.tanggal}</td>
                                                <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{rec.keterangan || '-'}</td>
                                            </tr>
                                        )) : (
                                             <tr><td colSpan={7} className="text-center py-10 text-slate-500">Tidak ada data yang cocok dengan filter yang dipilih.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            <div className="space-y-4 md:hidden">
                                {filteredAbsensiData.map(rec => (
                                    <div key={rec.id} className="bg-white/60 p-4 rounded-xl shadow">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <p className="font-bold text-slate-800">{rec.santri_nama}</p>
                                                <p className="text-xs text-slate-500">Kelas {rec.kelas}</p>
                                            </div>
                                            <span className="text-xs font-bold capitalize px-2 py-1 rounded-full bg-blue-100 text-blue-800">{rec.status}</span>
                                        </div>
                                        <p className="text-sm font-semibold text-slate-700 mt-2">{rec.kegiatan}</p>
                                        <div className="border-t my-2"></div>
                                        <div className="text-xs text-slate-500 space-y-1">
                                            <p><Icon name="calendar-alt" className="mr-1"/> {rec.tanggal} <Icon name="clock" className="ml-2 mr-1"/> {rec.waktu}</p>
                                            <p><Icon name="info-circle" className="mr-1"/> {rec.keterangan || 'Tidak ada keterangan'}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </GlassCard>
                    </div>
                );
        }
    }

    return (
        <div className="space-y-6 md:space-y-8 animate-fade-in">
             <div>
                <h2 className="text-2xl md:text-3xl font-bold text-slate-800">Laporan</h2>
                <p className="text-slate-600">Tinjau dan ekspor data absensi, pelanggaran, dan kesehatan.</p>
            </div>

            <GlassCard>
                <h3 className="text-lg md:text-xl font-bold text-slate-800 mb-4">Panel Kontrol Laporan</h3>
                <div className="space-y-4">
                    <div className="flex items-center space-x-2">
                        <p className="text-sm font-semibold text-slate-700 mr-2">Periode:</p>
                        <PeriodButton period="harian">Harian</PeriodButton>
                        <PeriodButton period="mingguan">Mingguan</PeriodButton>
                        <PeriodButton period="bulanan">Bulanan</PeriodButton>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                        {reportPeriod === 'harian' && <FormInput label="Tanggal" id="date-filter" type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} />}
                        {reportPeriod === 'mingguan' && 
                            <div>
                                <FormInput label="Pilih Tanggal (dalam seminggu)" id="week-filter" type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)} />
                                {selectedWeekRange && <p className="text-xs text-slate-600 mt-1 font-semibold">{selectedWeekRange}</p>}
                            </div>
                        }
                        {reportPeriod === 'bulanan' && <FormInput label="Bulan" id="month-filter" type="month" value={monthFilter} onChange={e => setMonthFilter(e.target.value)} />}
                        
                        <FormSelect label="Kelas" id="kelas-filter-report" value={kelasFilter} onChange={e => setKelasFilter(e.target.value)}>
                            <option value="">Semua Kelas</option>
                            {kelasData.map(k => <option key={k.id} value={k.nama_kelas}>{k.nama_kelas}</option>)}
                        </FormSelect>
                        
                        <FormInput label="Cari Santri" id="search-filter-report" placeholder="Ketik nama santri..." value={searchFilter} onChange={e => setSearchFilter(e.target.value)} />

                        {activeTab === 'absensi' && 
                            <FormSelect label="Status" id="status-filter" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                                <option value="">Semua Status</option>
                                <option value="hadir">Hadir</option>
                                <option value="tidak">Tidak Hadir</option>
                                <option value="izin">Izin</option>
                                <option value="terlambat">Terlambat</option>
                            </FormSelect>
                        }
                    </div>
                </div>
            </GlassCard>
            
            <div className="w-full">
                <div className="flex space-x-2 border-b-2 border-slate-200/80 mb-6 overflow-x-auto">
                    <TabButton tab="absensi"><Icon name="user-check" className="mr-2"/>Absensi</TabButton>
                    <TabButton tab="pelanggaran"><Icon name="exclamation-triangle" className="mr-2"/>Pelanggaran</TabButton>
                    <TabButton tab="kesehatan"><Icon name="heartbeat" className="mr-2"/>Kesehatan</TabButton>
                </div>
                <div className="p-1">
                  {renderContent()}
                </div>
            </div>
        </div>
    )
};

// --- PEMBINAAN COMPONENT ---
const Pembinaan: FC<{
    santriData: Santri[];
    pembinaData: Pembina[];
    kelasData: Kelas[];
    jenisPelanggaranData: JenisPelanggaran[];
    pelanggaranData: Pelanggaran[];
    kesehatanData: Kesehatan[];
    absensiHistory: AbsensiRecord[];
    onAddPelanggaran: (pelanggaran: Omit<Pelanggaran, 'id'>) => void;
    onAddKesehatan: (kesehatan: Omit<Kesehatan, 'id'>) => void;
}> = ({ 
    santriData, 
    pembinaData, 
    kelasData,
    jenisPelanggaranData,
    pelanggaranData,
    kesehatanData,
    absensiHistory,
    onAddPelanggaran, 
    onAddKesehatan 
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [kelasFilter, setKelasFilter] = useState('');
    const [activeSantriId, setActiveSantriId] = useState<number | null>(null);
    const { addToast } = useToast();

    const filteredSantri = useMemo(() => {
        return santriData.filter(santri => {
            const searchMatch = searchQuery.trim() === '' ||
                santri.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
                santri.nomor_induk.toLowerCase().includes(searchQuery.toLowerCase());
            const kelasMatch = kelasFilter === '' || santri.kelas === kelasFilter;
            return searchMatch && kelasMatch;
        });
    }, [santriData, searchQuery, kelasFilter]);

    const handleSantriSelect = (santriId: number) => {
        setActiveSantriId(prevId => prevId === santriId ? null : santriId);
    };

    const ActionPanel: FC<{ santri: Santri; absensiHistory: AbsensiRecord[] }> = ({ santri, absensiHistory }) => {
        const [activeTab, setActiveTab] = useState<'pelanggaran' | 'kesehatan' | 'absensi'>('pelanggaran');
        const formRef = useRef<HTMLFormElement>(null);
        const pelanggaranSelectRef = useRef<HTMLSelectElement>(null);
        const kesehatanSelectRef = useRef<HTMLSelectElement>(null);
        
        useEffect(() => {
            if (activeTab === 'pelanggaran') {
                setTimeout(() => pelanggaranSelectRef.current?.focus(), 50);
            } else if (activeTab === 'kesehatan') {
                setTimeout(() => kesehatanSelectRef.current?.focus(), 50);
            }
        }, [activeTab]);


        const santriPelanggaranHistory = useMemo(() => 
            pelanggaranData.filter(p => p.santri_id === santri.id).sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime()).slice(0, 5)
        , [pelanggaranData, santri.id]);

        const santriKesehatanHistory = useMemo(() => 
            kesehatanData.filter(k => k.santri_id === santri.id).sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime()).slice(0, 5)
        , [kesehatanData, santri.id]);
        
        const santriAbsensiHistory = useMemo(() => 
            absensiHistory.filter(a => a.santri_id === santri.id).sort((a, b) => new Date(b.tanggal).getTime() - new Date(a.tanggal).getTime()).slice(0, 5)
        , [absensiHistory, santri.id]);

        const handleSubmit = (e: FormEvent) => {
            e.preventDefault();
            const form = e.target as HTMLFormElement;
            const formData = new FormData(form);

            if (activeTab === 'pelanggaran') {
                const newPelanggaran = {
                    santri_id: santri.id,
                    santri_nama: santri.nama,
                    jenis: formData.get('jenis') as string,
                    deskripsi: formData.get('deskripsi') as string,
                    tanggal: new Date().toISOString().split('T')[0],
                    pembina: formData.get('pembina') as string,
                };
                if (!newPelanggaran.jenis || !newPelanggaran.pembina) {
                    addToast('Harap lengkapi semua kolom yang wajib diisi.', 'error');
                    return;
                }
                onAddPelanggaran(newPelanggaran);
                addToast('Catatan pelanggaran berhasil ditambahkan.', 'success');
            } else if (activeTab === 'kesehatan') {
                 const newKesehatan = {
                    santri_id: santri.id,
                    santri_nama: santri.nama,
                    status: formData.get('status') as 'sakit' | 'sembuh' | 'izin',
                    catatan: formData.get('catatan') as string,
                    tanggal: new Date().toISOString().split('T')[0],
                    pembina: formData.get('pembina') as string,
                };
                 if (!newKesehatan.status || !newKesehatan.catatan || !newKesehatan.pembina) {
                    addToast('Harap lengkapi semua kolom yang wajib diisi.', 'error');
                    return;
                }
                onAddKesehatan(newKesehatan);
                addToast('Catatan kesehatan berhasil ditambahkan.', 'success');
            }
            form.reset();
        };
        
        const getStatusColor = (status: AbsensiRecord['status']) => {
            switch(status) {
                case 'hadir': return 'bg-green-500';
                case 'tidak': return 'bg-red-500';
                case 'izin': return 'bg-yellow-500';
                case 'terlambat': return 'bg-purple-500';
                default: return 'bg-gray-500';
            }
        };

        return (
            <div className="bg-slate-50/80 p-4 md:p-6 rounded-b-2xl animate-fade-in-fast -mt-2">
                <div className="flex border-b mb-4 text-sm md:text-base overflow-x-auto">
                    <button onClick={() => setActiveTab('pelanggaran')} className={`pb-2 px-3 md:px-4 font-semibold border-b-2 whitespace-nowrap ${activeTab === 'pelanggaran' ? 'border-red-500 text-red-600' : 'border-transparent text-slate-500'}`}>
                        <Icon name="exclamation-triangle" className="mr-2" /> Pelanggaran
                    </button>
                    <button onClick={() => setActiveTab('kesehatan')} className={`pb-2 px-3 md:px-4 font-semibold border-b-2 whitespace-nowrap ${activeTab === 'kesehatan' ? 'border-blue-500 text-blue-600' : 'border-transparent text-slate-500'}`}>
                        <Icon name="heartbeat" className="mr-2" /> Kesehatan
                    </button>
                    <button onClick={() => setActiveTab('absensi')} className={`pb-2 px-3 md:px-4 font-semibold border-b-2 whitespace-nowrap ${activeTab === 'absensi' ? 'border-green-500 text-green-600' : 'border-transparent text-slate-500'}`}>
                        <Icon name="user-check" className="mr-2" /> Riwayat Absensi
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <h4 className="font-bold text-slate-800 text-lg">
                             {activeTab === 'pelanggaran' && 'Form Pelanggaran'}
                             {activeTab === 'kesehatan' && 'Form Kesehatan'}
                             {activeTab === 'absensi' && 'Detail Santri'}
                            <span className="block text-sm font-normal text-slate-600">
                                Untuk santri: <span className="font-semibold text-purple-600">{santri.nama}</span>
                            </span>
                        </h4>
                        {activeTab !== 'absensi' ? (
                            <form ref={formRef} onSubmit={handleSubmit} className="space-y-4">
                                {activeTab === 'pelanggaran' && (
                                    <>
                                        <FormSelect ref={pelanggaranSelectRef} label="Jenis Pelanggaran" id={`jenis-${santri.id}`} name="jenis" required>
                                            <option value="">Pilih Jenis Pelanggaran</option>
                                            {jenisPelanggaranData.map(j => <option key={j.id} value={j.kode}>{j.nama}</option>)}
                                        </FormSelect>
                                        <FormTextarea label="Deskripsi (Opsional)" id={`deskripsi-${santri.id}`} name="deskripsi" placeholder="Deskripsi singkat pelanggaran" />
                                    </>
                                )}
                                {activeTab === 'kesehatan' && (
                                    <>
                                        <FormSelect ref={kesehatanSelectRef} label="Status Kesehatan" id={`status-${santri.id}`} name="status" required>
                                            <option value="sakit">Sakit</option>
                                            <option value="sembuh">Sembuh</option>
                                            <option value="izin">Izin</option>
                                        </FormSelect>
                                        <FormTextarea label="Catatan" id={`catatan-${santri.id}`} name="catatan" placeholder="Catatan kondisi santri" required/>
                                    </>
                                )}
                                <FormSelect label="Pembina Pelapor" id={`pembina-${santri.id}`} name="pembina" required>
                                    <option value="">Pilih Pembina</option>
                                    {pembinaData.map(p => <option key={p.id} value={p.nama}>{p.nama}</option>)}
                                </FormSelect>
                                <ModernButton type="submit" className={`w-full ${activeTab === 'pelanggaran' ? 'bg-gradient-to-r from-red-500 to-pink-600' : 'bg-gradient-to-r from-blue-500 to-indigo-600'}`}>
                                    Simpan Catatan
                                </ModernButton>
                            </form>
                        ) : (
                            <div className="bg-white p-4 rounded-xl space-y-2 text-sm">
                                <p><strong className="text-slate-600 w-24 inline-block">Nomor Induk</strong>: {santri.nomor_induk}</p>
                                <p><strong className="text-slate-600 w-24 inline-block">Kelas</strong>: {santri.kelas}</p>
                                <p><strong className="text-slate-600 w-24 inline-block">Wali</strong>: {santri.wali}</p>
                                <p><strong className="text-slate-600 w-24 inline-block">Kontak Wali</strong>: {santri.kontak_wali}</p>
                            </div>
                        )}
                    </div>
                     <div>
                        <h4 className="font-bold text-slate-700 mb-2">Riwayat Terbaru</h4>
                        {activeTab === 'pelanggaran' && (
                            <div className="space-y-2">
                                {santriPelanggaranHistory.length > 0 ? santriPelanggaranHistory.map(p => (
                                    <div key={p.id} className="bg-white p-2 rounded-lg text-xs">
                                        <p className="font-semibold text-red-600 capitalize">{p.jenis}</p>
                                        <p className="text-slate-500">{p.tanggal} - {p.pembina}</p>
                                    </div>
                                )) : <p className="text-xs text-slate-500">Belum ada riwayat pelanggaran.</p>}
                            </div>
                        )}
                        {activeTab === 'kesehatan' && (
                             <div className="space-y-2">
                                {santriKesehatanHistory.length > 0 ? santriKesehatanHistory.map(k => (
                                    <div key={k.id} className="bg-white p-2 rounded-lg text-xs">
                                        <p className="font-semibold text-blue-600 capitalize">{k.status}</p>
                                         <p className="text-slate-600">{k.catatan}</p>
                                        {/* FIX: Changed p.pembina to k.pembina as the loop variable is k. */}
                                        <p className="text-slate-500">{k.tanggal} - {k.pembina}</p>
                                    </div>
                                )) : <p className="text-xs text-slate-500">Belum ada riwayat kesehatan.</p>}
                            </div>
                        )}
                        {activeTab === 'absensi' && (
                             <div className="space-y-2">
                                {santriAbsensiHistory.length > 0 ? santriAbsensiHistory.map(a => (
                                    <div key={a.id} className="bg-white p-2.5 rounded-lg text-xs">
                                        <div className="flex justify-between items-center">
                                            <p className="font-semibold text-slate-700">{a.kegiatan}</p>
                                            <span className={`px-2 py-0.5 rounded-full font-bold text-white text-[10px] capitalize ${getStatusColor(a.status)}`}>
                                                {a.status}
                                            </span>
                                        </div>
                                        <p className="text-slate-500 mt-1">{a.tanggal} - Pukul {a.waktu}</p>
                                    </div>
                                )) : <p className="text-xs text-slate-500">Belum ada riwayat absensi.</p>}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="space-y-6 md:space-y-8 animate-fade-in">
            <div>
                <h2 className="text-2xl md:text-3xl font-bold text-slate-800">Pembinaan Santri</h2>
                <p className="text-slate-600">Pilih santri untuk mencatat pelanggaran atau status kesehatan.</p>
            </div>
             <GlassCard>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormInput label="Cari Santri" id="pembinaan-search" placeholder="Cari santri berdasarkan nama atau nomor induk..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                    <FormSelect label="Filter Kelas" id="pembinaan-kelas" value={kelasFilter} onChange={e => setKelasFilter(e.target.value)}>
                        <option value="">Semua Kelas</option>
                        {kelasData.map(k => <option key={k.id} value={k.nama_kelas}>{k.nama_kelas}</option>)}
                    </FormSelect>
                </div>
            </GlassCard>

            <GlassCard>
                <h3 className="text-xl md:text-2xl font-bold text-slate-800 mb-4">Daftar Santri</h3>
                <div className="space-y-2">
                    {filteredSantri.length > 0 ? filteredSantri.map(santri => (
                        <div key={santri.id}>
                            <div
                                onClick={() => handleSantriSelect(santri.id)}
                                className={`flex items-center p-3 rounded-2xl cursor-pointer transition-all duration-300 ${activeSantriId === santri.id ? 'bg-purple-600 text-white shadow-lg transform scale-[1.02]' : 'bg-white/60 hover:bg-white hover:shadow-md'}`}
                            >
                               <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-4 flex-shrink-0 font-bold ${activeSantriId === santri.id ? 'bg-white text-purple-600' : 'bg-purple-100 text-purple-600'}`}>
                                    {santri.nama.charAt(0)}
                                </div>
                                <div>
                                    <p className={`font-bold ${activeSantriId === santri.id ? 'text-white' : 'text-slate-900'}`}>{santri.nama}</p>
                                    <p className={`text-sm ${activeSantriId === santri.id ? 'text-purple-100' : 'text-slate-700'}`}>
                                        {santri.nomor_induk} &bull; Kelas {santri.kelas}
                                    </p>
                                </div>
                                <Icon name={activeSantriId === santri.id ? 'chevron-up' : 'chevron-down'} className="ml-auto text-lg"/>
                            </div>
                            {activeSantriId === santri.id && <ActionPanel santri={santri} absensiHistory={absensiHistory} />}
                        </div>
                    )) : (
                        <p className="text-center text-slate-500 py-8">Tidak ada santri yang cocok dengan filter.</p>
                    )}
                </div>
            </GlassCard>
        </div>
    );
}

// --- MANAJEMEN DATA COMPONENT ---
const ManajemenData: FC<{
    currentUser: User;
    santriData: Santri[];
    pembinaData: Pembina[];
    kelasData: Kelas[];
    kegiatanData: Kegiatan[];
    adminData: AdminData[];
    onCrud: (type: DataTab, action: 'add' | 'edit' | 'delete', data: any) => void;
    onImport: (type: 'santri' | 'pembina', data: any[]) => void;
}> = ({ currentUser, santriData, pembinaData, kelasData, kegiatanData, adminData, onCrud, onImport }) => {
    const [activeTab, setActiveTab] = useState<DataTab>('santri');
    const [isModalOpen, setModalOpen] = useState(false);
    const [editingData, setEditingData] = useState<any>(null);
    const { addToast } = useToast();
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        addToast('Memproses file...', 'info');
        
        try {
            const data = await importFromExcel(file);

            if (data.length === 0) {
                addToast('File kosong atau format tidak didukung.', 'error');
                return;
            }

            // Validate headers
            const headers = Object.keys(data[0]);
            let expectedHeaders: string[] = [];
            if (activeTab === 'santri') {
                expectedHeaders = SANTRI_UPLOAD_HEADERS;
            } else if (activeTab === 'pembina') {
                expectedHeaders = PEMBINA_UPLOAD_HEADERS;
            } else {
                addToast(`Upload tidak didukung untuk tab ${activeTab}.`, 'error');
                return;
            }

            const missingHeaders = expectedHeaders.filter(h => !headers.includes(h));
            if (missingHeaders.length > 0) {
                addToast(`Header file tidak valid. Header yang hilang: ${missingHeaders.join(', ')}`, 'error');
                return;
            }

            onImport(activeTab as 'santri' | 'pembina', data);

        } catch (error: any) {
            addToast(error.message || 'Terjadi kesalahan saat mengimpor file.', 'error');
        } finally {
            if(fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const openModal = (data: any = null) => {
        setEditingData(data);
        setModalOpen(true);
    };

    const closeModal = () => {
        setEditingData(null);
        setModalOpen(false);
    };

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault();
        const form = e.target as HTMLFormElement;
        const formData = new FormData(form);
        const singleValueData = Object.fromEntries(formData.entries());

        let finalData: any = singleValueData;

        if (activeTab === 'kegiatan') {
            const hariAktif = formData.getAll('hari_aktif') as string[];
            finalData = { ...singleValueData, hari_aktif: hariAktif };
        }
        
        if (editingData) {
            onCrud(activeTab, 'edit', { ...editingData, ...finalData });
        } else {
            onCrud(activeTab, 'add', { ...finalData }); // ID will be added by API
        }
        closeModal();
    };
    
    const TabButton: FC<{tab: DataTab, children: React.ReactNode}> = ({ tab, children }) => (
      <button
        onClick={() => setActiveTab(tab)}
        className={`px-3 py-2 text-sm md:text-base font-semibold rounded-lg transition-all ${activeTab === tab ? 'bg-purple-600 text-white shadow-md' : 'text-slate-600 hover:bg-purple-100'}`}
      >
        {children}
      </button>
    );

    const renderSantriForm = () => (
        <form onSubmit={handleSubmit} className="space-y-4">
            <FormInput label="Nomor Induk" id="nomor_induk" defaultValue={editingData?.nomor_induk} required/>
            <FormInput label="Nama Lengkap" id="nama" defaultValue={editingData?.nama} required/>
            <FormInput label="Kelas" id="kelas" defaultValue={editingData?.kelas} required/>
            <FormInput label="Tempat, Tanggal Lahir" id="ttl" defaultValue={editingData?.ttl} />
            <FormInput label="Alamat" id="alamat" defaultValue={editingData?.alamat} />
            <FormInput label="Nama Wali" id="wali" defaultValue={editingData?.wali} />
            <FormInput label="Kontak Wali" id="kontak_wali" defaultValue={editingData?.kontak_wali} />
            <ModernButton type="submit" className="w-full bg-gradient-to-r from-purple-600 to-indigo-700">Simpan Data</ModernButton>
        </form>
    );

     const renderPembinaForm = () => (
        <form onSubmit={handleSubmit} className="space-y-4">
            <FormInput label="ID Pembina" id="id_pembina" defaultValue={editingData?.id_pembina} required/>
            <FormInput label="Nama Lengkap" id="nama" defaultValue={editingData?.nama} required/>
            <FormInput label="Kontak" id="kontak" defaultValue={editingData?.kontak} required/>
            <FormInput label="Alamat" id="alamat" defaultValue={editingData?.alamat} />
            <FormInput label="Pendidikan" id="pendidikan" defaultValue={editingData?.pendidikan} />
            <FormSelect label="Status" id="status" defaultValue={editingData?.status || 'Aktif'}>
                <option>Aktif</option>
                <option>Tidak Aktif</option>
            </FormSelect>
            <FormInput label="Kelas Diampu (pisah koma)" id="kelas_diampu" defaultValue={editingData?.kelas_diampu?.join(', ')} />
            <ModernButton type="submit" className="w-full bg-gradient-to-r from-purple-600 to-indigo-700">Simpan Data</ModernButton>
        </form>
    );

    const renderKelasForm = () => (
        <form onSubmit={handleSubmit} className="space-y-4">
            <FormInput label="Nama Kelas" id="nama_kelas" defaultValue={editingData?.nama_kelas} required/>
            <FormSelect label="Tingkat" id="tingkat" defaultValue={editingData?.tingkat || 'Pemula'}>
                <option>Pemula</option>
                <option>Menengah</option>
                <option>Lanjutan</option>
            </FormSelect>
            <FormInput label="Kapasitas" id="kapasitas" type="number" defaultValue={editingData?.kapasitas} required/>
            <FormInput label="Pembina" id="pembina" defaultValue={editingData?.pembina} />
            <FormInput label="Jadwal" id="jadwal" defaultValue={editingData?.jadwal} />
            <FormInput label="Ruangan" id="ruangan" defaultValue={editingData?.ruangan} />
             <FormTextarea label="Deskripsi" id="deskripsi" defaultValue={editingData?.deskripsi} />
            <ModernButton type="submit" className="w-full bg-gradient-to-r from-purple-600 to-indigo-700">Simpan Data</ModernButton>
        </form>
    );

    const renderKegiatanForm = () => {
        const daysOfWeek = ['senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu', 'minggu'];
        return (
            <form onSubmit={handleSubmit} className="space-y-4">
                <FormInput label="Nama Kegiatan" id="nama" defaultValue={editingData?.nama} required/>
                <div className="grid grid-cols-2 gap-4">
                    <FormInput label="Jam Mulai" id="jam_mulai" type="time" defaultValue={editingData?.jam_mulai} required/>
                    <FormInput label="Jam Selesai" id="jam_selesai" type="time" defaultValue={editingData?.jam_selesai} required/>
                </div>
                <div className="space-y-2">
                    <label className="block text-sm font-semibold text-slate-700">Hari Aktif <span className="text-red-500 ml-1">*</span></label>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                        {daysOfWeek.map(day => (
                            <label key={day} className="flex items-center space-x-2 p-2 rounded-lg bg-gray-100 hover:bg-gray-200 cursor-pointer">
                                <input
                                    type="checkbox"
                                    name="hari_aktif"
                                    value={day}
                                    defaultChecked={editingData?.hari_aktif?.includes(day)}
                                    className="rounded text-purple-600 focus:ring-purple-500 border-gray-300"
                                />
                                <span className="capitalize text-sm font-medium text-slate-700">{day}</span>
                            </label>
                        ))}
                    </div>
                </div>
                <FormSelect label="Status" id="status" defaultValue={editingData?.status || 'aktif'}>
                    <option value="aktif">Aktif</option>
                    <option value="nonaktif">Nonaktif</option>
                </FormSelect>
                <FormTextarea label="Deskripsi" id="deskripsi" defaultValue={editingData?.deskripsi} />
                <ModernButton type="submit" className="w-full bg-gradient-to-r from-purple-600 to-indigo-700">Simpan Data</ModernButton>
            </form>
        );
    }
    
     const renderAdminForm = () => (
        <form onSubmit={handleSubmit} className="space-y-4">
            <FormInput label="Nama Lengkap" id="name" defaultValue={editingData?.name} required/>
            <FormInput label="Username" id="username" defaultValue={editingData?.username} required/>
            <FormInput label="Password" id="password" type="password" placeholder={editingData ? 'Kosongkan jika tidak ingin mengubah' : ''} required={!editingData}/>
            <ModernButton type="submit" className="w-full bg-gradient-to-r from-purple-600 to-indigo-700">Simpan Data</ModernButton>
        </form>
    );

    const renderContent = () => {
        const TableActions: FC<{item: any, type: DataTab}> = ({ item, type }) => (
            <div className="flex justify-end items-center space-x-2 mt-3 pt-3 border-t md:border-none md:pt-0 md:mt-0">
                <button onClick={() => openModal(item)} className="text-blue-600 hover:text-blue-700 transition-colors p-2 rounded-full hover:bg-blue-100"><Icon name="edit"/></button>
                <button onClick={() => onCrud(type, 'delete', item)} className="text-red-600 hover:text-red-700 transition-colors p-2 rounded-full hover:bg-red-100"><Icon name="trash"/></button>
            </div>
        );

        switch(activeTab) {
            case 'santri':
                return (
                    <div>
                        <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-3">
                             <h3 className="text-lg md:text-xl font-bold text-slate-800">Data Santri</h3>
                            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                                <ModernButton onClick={() => openModal()} className="bg-gradient-to-r from-purple-600 to-indigo-700 text-sm !py-2.5 w-full sm:w-auto"><Icon name="plus" className="mr-2"/> Tambah</ModernButton>
                                <ModernButton onClick={() => fileInputRef.current?.click()} className="bg-gradient-to-r from-teal-500 to-cyan-600 text-sm !py-2.5 w-full sm:w-auto"><Icon name="upload" className="mr-2"/> Upload</ModernButton>
                                <ModernButton onClick={downloadSantriTemplate} className="bg-gradient-to-r from-blue-500 to-cyan-500 text-sm !py-2.5 w-full sm:w-auto"><Icon name="download" className="mr-2"/> Template</ModernButton>
                            </div>
                        </div>
                        <div className="overflow-x-auto hidden md:block">
                           <table className="w-full">
                               <thead className="bg-gray-100/50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Nama</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Kelas</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Wali</th>
                                        <th className="px-6 py-3 text-right text-xs font-bold text-slate-600 uppercase">Aksi</th>
                                    </tr>
                               </thead>
                               <tbody>
                                   {santriData.map(s => (
                                       <tr key={s.id} className="hover:bg-gray-100/50">
                                           <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-semibold">{s.nama}</td>
                                           <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{s.kelas}</td>
                                           <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{s.wali}</td>
                                           <td className="px-6 py-4 text-right"><TableActions item={s} type="santri" /></td>
                                       </tr>
                                   ))}
                               </tbody>
                           </table>
                        </div>
                        <div className="space-y-4 md:hidden">
                            {santriData.map(s => (
                                <div key={s.id} className="bg-white/60 p-4 rounded-xl shadow">
                                    <p className="font-bold text-slate-800">{s.nama}</p>
                                    <p className="text-sm text-slate-600">Kelas: {s.kelas}</p>
                                    <p className="text-sm text-slate-600">Wali: {s.wali}</p>
                                    <TableActions item={s} type="santri" />
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case 'pembina':
                 return (
                    <div>
                         <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-3">
                             <h3 className="text-lg md:text-xl font-bold text-slate-800">Data Pembina</h3>
                             <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
                                <ModernButton onClick={() => openModal()} className="bg-gradient-to-r from-purple-600 to-indigo-700 text-sm !py-2.5 w-full sm:w-auto"><Icon name="plus" className="mr-2"/> Tambah</ModernButton>
                                <ModernButton onClick={() => fileInputRef.current?.click()} className="bg-gradient-to-r from-teal-500 to-cyan-600 text-sm !py-2.5 w-full sm:w-auto"><Icon name="upload" className="mr-2"/> Upload</ModernButton>
                                <ModernButton onClick={downloadPembinaTemplate} className="bg-gradient-to-r from-blue-500 to-cyan-500 text-sm !py-2.5 w-full sm:w-auto"><Icon name="download" className="mr-2"/> Template</ModernButton>
                            </div>
                        </div>
                        <div className="overflow-x-auto hidden md:block">
                           <table className="w-full">
                               <thead className="bg-gray-100/50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Nama</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Kontak</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Status</th>
                                        <th className="px-6 py-3 text-right text-xs font-bold text-slate-600 uppercase">Aksi</th>
                                    </tr>
                               </thead>
                               <tbody>
                                   {pembinaData.map(p => (
                                       <tr key={p.id} className="hover:bg-gray-100/50">
                                           <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-semibold">{p.nama}</td>
                                           <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{p.kontak}</td>
                                           <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{p.status}</td>
                                           <td className="px-6 py-4 text-right"><TableActions item={p} type="pembina" /></td>
                                       </tr>
                                   ))}
                               </tbody>
                           </table>
                        </div>
                        <div className="space-y-4 md:hidden">
                            {pembinaData.map(p => (
                                <div key={p.id} className="bg-white/60 p-4 rounded-xl shadow">
                                    <p className="font-bold text-slate-800">{p.nama}</p>
                                    <p className="text-sm text-slate-600">Kontak: {p.kontak}</p>
                                    <p className="text-sm text-slate-600">Status: {p.status}</p>
                                    <TableActions item={p} type="pembina" />
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case 'kelas':
                return (
                    <div>
                         <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-3">
                            <h3 className="text-lg md:text-xl font-bold text-slate-800">Data Kelas</h3>
                             <ModernButton onClick={() => openModal()} className="bg-gradient-to-r from-purple-600 to-indigo-700 text-sm !py-2.5 w-full sm:w-auto"><Icon name="plus" className="mr-2"/> Tambah Kelas</ModernButton>
                        </div>
                        <div className="overflow-x-auto hidden md:block">
                           <table className="w-full">
                               <thead className="bg-gray-100/50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Nama Kelas</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Tingkat</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Pembina</th>
                                         <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Jumlah Santri</th>
                                        <th className="px-6 py-3 text-right text-xs font-bold text-slate-600 uppercase">Aksi</th>
                                    </tr>
                               </thead>
                               <tbody>
                                   {kelasData.map(k => (
                                       <tr key={k.id} className="hover:bg-gray-100/50">
                                           <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-semibold">{k.nama_kelas}</td>
                                           <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{k.tingkat}</td>
                                           <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{k.pembina}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{k.jumlah_santri}/{k.kapasitas}</td>
                                           <td className="px-6 py-4 text-right"><TableActions item={k} type="kelas" /></td>
                                       </tr>
                                   ))}
                               </tbody>
                           </table>
                        </div>
                         <div className="space-y-4 md:hidden">
                            {kelasData.map(k => (
                                <div key={k.id} className="bg-white/60 p-4 rounded-xl shadow">
                                    <p className="font-bold text-slate-800">Kelas {k.nama_kelas} <span className="text-sm font-medium text-slate-500">({k.tingkat})</span></p>
                                    <p className="text-sm text-slate-600">Pembina: {k.pembina}</p>
                                    <p className="text-sm text-slate-600">Santri: {k.jumlah_santri}/{k.kapasitas}</p>
                                    <TableActions item={k} type="kelas" />
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case 'kegiatan':
                 return (
                    <div>
                         <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-3">
                            <h3 className="text-lg md:text-xl font-bold text-slate-800">Data Kegiatan</h3>
                             <ModernButton onClick={() => openModal()} className="bg-gradient-to-r from-purple-600 to-indigo-700 text-sm !py-2.5 w-full sm:w-auto"><Icon name="plus" className="mr-2"/> Tambah Kegiatan</ModernButton>
                        </div>
                        <div className="overflow-x-auto hidden md:block">
                           <table className="w-full">
                               <thead className="bg-gray-100/50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Nama Kegiatan</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Jadwal</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Hari Aktif</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Status</th>
                                        <th className="px-6 py-3 text-right text-xs font-bold text-slate-600 uppercase">Aksi</th>
                                    </tr>
                               </thead>
                               <tbody>
                                   {kegiatanData.map(k => (
                                       <tr key={k.id} className="hover:bg-gray-100/50">
                                           <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-semibold">{k.nama}</td>
                                           <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{k.jam_mulai} - {k.jam_selesai}</td>
                                           <td className="px-6 py-4 text-sm text-slate-700 capitalize">{k.hari_aktif.join(', ')}</td>
                                           <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700 capitalize">
                                                <span className={`px-2 py-1 text-xs font-bold rounded-full text-white ${k.status === 'aktif' ? 'bg-green-500' : 'bg-red-500'}`}>
                                                    {k.status}
                                                </span>
                                           </td>
                                           <td className="px-6 py-4 text-right"><TableActions item={k} type="kegiatan" /></td>
                                       </tr>
                                   ))}
                               </tbody>
                           </table>
                        </div>
                        <div className="space-y-4 md:hidden">
                            {kegiatanData.map(k => (
                                <div key={k.id} className="bg-white/60 p-4 rounded-xl shadow">
                                    <div className="flex justify-between items-start">
                                        <p className="font-bold text-slate-800">{k.nama}</p>
                                        <span className={`px-2 py-1 text-xs font-bold rounded-full text-white ${k.status === 'aktif' ? 'bg-green-500' : 'bg-red-500'}`}>{k.status}</span>
                                    </div>
                                    <p className="text-sm text-slate-600">{k.jam_mulai} - {k.jam_selesai}</p>
                                    <p className="text-xs text-slate-500 capitalize mt-1">{k.hari_aktif.join(', ')}</p>
                                    <TableActions item={k} type="kegiatan" />
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case 'admin':
                return (
                    <div>
                         <div className="flex flex-col sm:flex-row justify-between items-center mb-4 gap-3">
                            <h3 className="text-lg md:text-xl font-bold text-slate-800">Data Admin</h3>
                             <ModernButton onClick={() => openModal()} className="bg-gradient-to-r from-purple-600 to-indigo-700 text-sm !py-2.5 w-full sm:w-auto"><Icon name="plus" className="mr-2"/> Tambah Admin</ModernButton>
                        </div>
                        <div className="overflow-x-auto hidden md:block">
                           <table className="w-full">
                               <thead className="bg-gray-100/50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Nama</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-slate-600 uppercase">Username</th>
                                        <th className="px-6 py-3 text-right text-xs font-bold text-slate-600 uppercase">Aksi</th>
                                    </tr>
                               </thead>
                               <tbody>
                                   {adminData.map(a => (
                                       <tr key={a.id} className="hover:bg-gray-100/50">
                                           <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-900 font-semibold">{a.name}</td>
                                           <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-700">{a.username}</td>
                                           <td className="px-6 py-4 text-right"><TableActions item={a} type="admin" /></td>
                                       </tr>
                                   ))}
                               </tbody>
                           </table>
                        </div>
                        <div className="space-y-4 md:hidden">
                            {adminData.map(a => (
                                <div key={a.id} className="bg-white/60 p-4 rounded-xl shadow">
                                    <p className="font-bold text-slate-800">{a.name}</p>
                                    <p className="text-sm text-slate-600">Username: {a.username}</p>
                                    <TableActions item={a} type="admin" />
                                </div>
                            ))}
                        </div>
                    </div>
                );
        }
    }

    return (
        <div className="space-y-6 md:space-y-8 animate-fade-in">
             <div>
                <h2 className="text-2xl md:text-3xl font-bold text-slate-800">Manajemen Data</h2>
                <p className="text-slate-600">Kelola data master santri, pembina, dan kelas.</p>
            </div>
             <GlassCard>
                <div className="flex space-x-2 border-b-2 border-gray-200/80 mb-6 pb-2 flex-wrap">
                    <TabButton tab="santri"><Icon name="user-graduate" className="mr-2"/>Santri</TabButton>
                    <TabButton tab="pembina"><Icon name="user-tie" className="mr-2"/>Pembina</TabButton>
                    <TabButton tab="kelas"><Icon name="chalkboard-teacher" className="mr-2"/>Kelas</TabButton>
                    <TabButton tab="kegiatan"><Icon name="calendar-alt" className="mr-2"/>Kegiatan</TabButton>
                    {currentUser.role === 'superadmin' && <TabButton tab="admin"><Icon name="user-shield" className="mr-2"/>Admin</TabButton>}
                </div>
                {renderContent()}
            </GlassCard>
             <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                accept=".xlsx, .xls"
            />
             <Modal isOpen={isModalOpen} onClose={closeModal} title={`${editingData ? 'Edit' : 'Tambah'} Data ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}`}>
                 {activeTab === 'santri' && renderSantriForm()}
                 {activeTab === 'pembina' && renderPembinaForm()}
                 {activeTab === 'kelas' && renderKelasForm()}
                 {activeTab === 'kegiatan' && renderKegiatanForm()}
                 {activeTab === 'admin' && renderAdminForm()}
             </Modal>
        </div>
    )
};

// --- MAIN APP COMPONENT ---

const App: FC = () => {
    // --- STATE MANAGEMENT ---
    const [isLoading, setIsLoading] = useState(true);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [activeSection, setActiveSection] = useState<Section>('dashboard');
    const [isSidebarOpen, setSidebarOpen] = useState(false);
    
    // Connection Status State
    const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
    const [connectionError, setConnectionError] = useState<string | null>(null);
    const [isConnectionModalOpen, setIsConnectionModalOpen] = useState(false);


    // Data states
    const [santriData, setSantriData] = useState<Santri[]>([]);
    const [pembinaData, setPembinaData] = useState<Pembina[]>([]);
    const [kelasData, setKelasData] = useState<Kelas[]>([]);
    const [kegiatanData, setKegiatanData] = useState<Kegiatan[]>([]);
    const [pelanggaranData, setPelanggaranData] = useState<Pelanggaran[]>([]);
    const [kesehatanData, setKesehatanData] = useState<Kesehatan[]>([]);
    const [absensiHistory, setAbsensiHistory] = useState<AbsensiRecord[]>([]);
    const [adminData, setAdminData] = useState<AdminData[]>([]);
    const [currentKegiatan, setCurrentKegiatan] = useState<Kegiatan | null>(null);

    // AI Modal State
    const [isAiModalOpen, setIsAiModalOpen] = useState(false);
    const [aiSummary, setAiSummary] = useState('');
    const [isAiLoading, setIsAiLoading] = useState(false);


    const { addToast } = useToast();
    const sessionTimeoutRef = useRef<number | null>(null);

    // --- COMPUTED VALUES ---
    const SESSION_DURATION = 30 * 60 * 1000; // 30 minutes

    // --- EFFECTS ---
    useEffect(() => {
        // This effect runs once on initial app load to fetch all data.
        // This makes data available for the login screen to validate credentials.
        apiService.fetchAllData()
            .then(data => {
                setSantriData(data.santri || []);
                setPembinaData(data.pembina || []);
                setKelasData(data.kelas || []);
                setKegiatanData(data.kegiatan || []);
                setPelanggaranData(data.pelanggaran || []);
                setKesehatanData(data.kesehatan || []);
                setAbsensiHistory(data.absensiHistory || []);
                setAdminData(data.admin || []);
                setConnectionStatus('connected');
            })
            .catch(err => {
                console.error("Failed to fetch data on initial load:", err);
                setConnectionStatus('error');
                setConnectionError(err.message);
                // Still show login, but it will be limited
            })
            .finally(() => {
                setIsLoading(false);
            });
    }, []);


    useEffect(() => {
        const resetSessionTimer = () => {
            if (currentUser) {
                if (sessionTimeoutRef.current) {
                    clearTimeout(sessionTimeoutRef.current);
                }
                sessionTimeoutRef.current = window.setTimeout(() => {
                    addToast('Sesi Anda telah berakhir karena tidak ada aktivitas.', 'info');
                    handleLogout();
                }, SESSION_DURATION);
            }
        };

        window.addEventListener('mousemove', resetSessionTimer);
        window.addEventListener('keypress', resetSessionTimer);
        resetSessionTimer();

        return () => {
            if (sessionTimeoutRef.current) {
                clearTimeout(sessionTimeoutRef.current);
            }
            window.removeEventListener('mousemove', resetSessionTimer);
            window.removeEventListener('keypress', resetSessionTimer);
        };
    }, [currentUser, addToast]);
    
    // --- HANDLERS ---
    const handleLogin = (user: User) => {
        setCurrentUser(user);
        setActiveSection('dashboard');
        // Data is already loaded, so we just show a welcome message
        if (connectionStatus === 'connected') {
            addToast(`Selamat datang, ${user.name}!`, 'success');
        } else {
            addToast(`Login berhasil, namun ada masalah koneksi ke database.`, 'error');
        }
    };

    const handleLogout = () => {
        setCurrentUser(null);
        addToast('Logout berhasil!', 'success');
    };

    const handleNavigate = (section: Section) => {
        setActiveSection(section);
        if (window.innerWidth < 1024) {
            setSidebarOpen(false);
        }
    };
    
    const handleStartAbsensi = (kegiatan: Kegiatan) => {
        setCurrentKegiatan(kegiatan);
        handleNavigate('absensi');
        addToast(`Memulai absensi untuk: ${kegiatan.nama}`, 'info');
    };

    const handleConnectionStatusClick = () => {
        if (connectionStatus === 'error') {
            setIsConnectionModalOpen(true);
        }
    };

    const handleMarkAttendance = (santriId: number, status: 'hadir' | 'tidak' | 'izin' | 'terlambat', keterangan?: string) => {
        if (!currentKegiatan) {
            addToast('Pilih kegiatan terlebih dahulu!', 'error');
            return;
        }

        const santri = santriData.find(s => s.id === santriId);
        if (!santri) return;

        const time = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

        const updatedSantri = { ...santri, status, waktu: time, keterangan: keterangan || null };
        const newRecord: Omit<AbsensiRecord, 'id'> = {
            santri_id: santri.id,
            santri_nama: santri.nama,
            kelas: santri.kelas,
            status,
            waktu: time,
            tanggal: new Date().toISOString().split('T')[0],
            kegiatan: currentKegiatan.nama,
            keterangan: keterangan || undefined,
        };

        Promise.all([
            apiService.santriApi.update(updatedSantri),
            apiService.absensiHistoryApi.add(newRecord)
        ]).then(([updatedSantriResponse, newAbsensiRecord]) => {
            setSantriData(prev => prev.map(s => s.id === santriId ? updatedSantriResponse : s));
            setAbsensiHistory(prev => [...prev, newAbsensiRecord]);
            addToast(`Absensi ${santri.nama} sebagai '${status}' berhasil dicatat.`, 'success');
        }).catch(err => {
            console.error("Failed to mark attendance:", err);
            addToast('Gagal menyimpan absensi.', 'error');
        });
    };
    
    const handleResetAbsensiStatus = () => {
        setSantriData(prevData =>
            prevData.map(s => ({ ...s, status: null, waktu: null, keterangan: null }))
        );
    };

    const handleAddPelanggaran = (pelanggaran: Omit<Pelanggaran, 'id'>) => {
        apiService.pelanggaranApi.add(pelanggaran).then(newPelanggaran => {
            setPelanggaranData(prev => [...prev, newPelanggaran]);
        }).catch(err => {
            console.error("Failed to add pelanggaran:", err);
            addToast('Gagal menyimpan catatan pelanggaran.', 'error');
        });
    };

    const handleAddKesehatan = (kesehatan: Omit<Kesehatan, 'id'>) => {
        apiService.kesehatanApi.add(kesehatan).then(newKesehatan => {
            setKesehatanData(prev => [...prev, newKesehatan]);
        }).catch(err => {
            console.error("Failed to add kesehatan:", err);
            addToast('Gagal menyimpan catatan kesehatan.', 'error');
        });
    };

    const handleCrud = (type: DataTab, action: 'add' | 'edit' | 'delete', data: any) => {
        const apiMap = {
            santri: { api: apiService.santriApi, setData: setSantriData },
            pembina: { api: apiService.pembinaApi, setData: setPembinaData },
            kelas: { api: apiService.kelasApi, setData: setKelasData },
            kegiatan: { api: apiService.kegiatanApi, setData: setKegiatanData },
            admin: { api: apiService.adminApi, setData: setAdminData },
        };

        if (type !== 'santri' && type !== 'pembina' && type !== 'kelas' && type !== 'kegiatan' && type !== 'admin') return;

        const { api, setData } = apiMap[type];
        const typeName = type.charAt(0).toUpperCase() + type.slice(1);
        
        if (action === 'add') {
            api.add(data).then(newItem => {
                setData((prev: any) => [...prev, newItem]);
                addToast(`${typeName} baru berhasil ditambahkan!`, 'success');
            }).catch(err => addToast(`Gagal menambahkan ${typeName}.`, 'error'));
        } else if (action === 'edit') {
            api.update(data).then(updatedItem => {
                setData((prev: any) => prev.map((item: any) => item.id === updatedItem.id ? updatedItem : item));
                addToast(`Data ${typeName} berhasil diperbarui!`, 'success');
            }).catch(err => addToast(`Gagal memperbarui ${typeName}.`, 'error'));
        } else if (action === 'delete') {
            if (window.confirm(`Apakah Anda yakin ingin menghapus data ${typeName} ini?`)) {
                api.delete(data.id).then(() => {
                    setData((prev: any) => prev.filter((item: any) => item.id !== data.id));
                    addToast(`Data ${typeName} berhasil dihapus!`, 'success');
                }).catch(err => addToast(`Gagal menghapus ${typeName}.`, 'error'));
            }
        }
    };

    const handleImport = (type: 'santri' | 'pembina', importData: any[]) => {
        // Simple import: add all new data. A more robust solution would check for duplicates.
        const apiMap = {
            santri: { api: apiService.santriApi, setData: setSantriData },
            pembina: { api: apiService.pembinaApi, setData: setPembinaData },
        };
        const { api, setData } = apiMap[type];
        const promises = importData.map(item => api.add(item));

        Promise.all(promises)
            .then(newItems => {
                setData((prev: any) => [...prev, ...newItems]);
                addToast(`${newItems.length} data ${type} berhasil diimpor!`, 'success');
            })
            .catch(err => {
                console.error("Import error:", err);
                addToast(`Terjadi kesalahan saat mengimpor data ${type}.`, 'error');
            });
    };

    const handleGenerateAiSummary = useCallback(async (data: any[], reportType: ReportTab) => {
        if (data.length === 0) {
            addToast("Tidak ada data untuk dianalisis.", "info");
            return;
        }

        setIsAiModalOpen(true);
        setIsAiLoading(true);
        setAiSummary('');

        try {
            const response = await fetch('/api/generate-summary', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ data, reportType }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Gagal menghubungi backend AI.');
            }

            const result = await response.json();
            setAiSummary(result.summary);

        } catch (error: any) {
            console.error("AI summary error:", error);
            addToast(error.message || "Gagal menghasilkan ringkasan AI.", "error");
            setIsAiModalOpen(false); // Close modal on error
        } finally {
            setIsAiLoading(false);
        }
    }, [addToast]);


    // --- RENDER LOGIC ---
    if (isLoading) {
        return <LoadingScreen message="Menghubungkan & Memuat Data..." />;
    }

    if (!currentUser) {
        return <LoginScreen onLogin={handleLogin} adminData={adminData} pembinaData={pembinaData} />;
    }

    const renderContent = () => {
        switch (activeSection) {
            case 'dashboard':
                return <Dashboard santriData={santriData} kegiatanData={kegiatanData} absensiHistory={absensiHistory} onStartAbsensi={handleStartAbsensi}/>;
            case 'absensi':
                return <Absensi 
                    santriData={santriData}
                    kelasData={kelasData}
                    kegiatanData={kegiatanData}
                    currentKegiatan={currentKegiatan}
                    onMarkAttendance={handleMarkAttendance}
                    onChangeKegiatan={setCurrentKegiatan}
                    onResetAbsensi={handleResetAbsensiStatus}
                />;
            case 'laporan':
                return <Laporan 
                    santriData={santriData} 
                    absensiHistory={absensiHistory} 
                    kelasData={kelasData}
                    pelanggaranData={pelanggaranData}
                    kesehatanData={kesehatanData}
                    onGenerateAiSummary={handleGenerateAiSummary}
                />;
            case 'manajemen':
                 return <ManajemenData 
                    currentUser={currentUser}
                    santriData={santriData}
                    pembinaData={pembinaData}
                    kelasData={kelasData}
                    kegiatanData={kegiatanData}
                    adminData={adminData}
                    onCrud={handleCrud}
                    onImport={handleImport}
                />;
            case 'pembinaan':
                return <Pembinaan
                    santriData={santriData}
                    pembinaData={pembinaData}
                    kelasData={kelasData}
                    jenisPelanggaranData={INITIAL_JENIS_PELANGGARAN_DATA}
                    pelanggaranData={pelanggaranData}
                    kesehatanData={kesehatanData}
                    absensiHistory={absensiHistory}
                    onAddPelanggaran={handleAddPelanggaran}
                    onAddKesehatan={handleAddKesehatan}
                />
            default:
                return <Dashboard santriData={santriData} kegiatanData={kegiatanData} absensiHistory={absensiHistory} onStartAbsensi={handleStartAbsensi}/>;
        }
    };
    
    return (
        <div className="min-h-screen bg-slate-100/50 text-slate-900">
             <div className="absolute inset-0 h-full w-full bg-white bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:16px_16px] -z-10"></div>
            <div className={`fixed inset-y-0 left-0 z-40 w-72 bg-white/80 backdrop-blur-2xl shadow-2xl transition-transform duration-300 lg:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <Sidebar activeSection={activeSection} onNavigate={handleNavigate} userRole={currentUser.role}/>
            </div>

            <div className="lg:pl-72 transition-all duration-300">
                <Header 
                    user={currentUser} 
                    onLogout={handleLogout} 
                    onToggleSidebar={() => setSidebarOpen(!isSidebarOpen)}
                    connectionStatus={connectionStatus}
                    onConnectionStatusClick={handleConnectionStatusClick}
                />
                <main className="p-4 md:p-8">
                    {renderContent()}
                </main>
            </div>
             <Modal isOpen={isAiModalOpen} onClose={() => setIsAiModalOpen(false)} title="Ringkasan Laporan AI" size="lg">
                {isAiLoading ? (
                    <div className="flex flex-col items-center justify-center p-8 space-y-4">
                        <Icon name="spinner" className="fa-spin text-4xl text-purple-600" />
                        <p className="text-slate-600 font-semibold">AI sedang menganalisis data dan membuat ringkasan...</p>
                    </div>
                ) : (
                    <div className="prose max-w-none p-2">
                        <pre className="whitespace-pre-wrap font-sans bg-slate-50 p-4 rounded-lg text-slate-800">{aiSummary}</pre>
                    </div>
                )}
            </Modal>
             <Modal isOpen={isConnectionModalOpen} onClose={() => setIsConnectionModalOpen(false)} title="Koneksi Database Gagal" size="lg">
                <div className="space-y-4 text-slate-700">
                    <p>Terjadi kesalahan saat mencoba terhubung ke database Google Sheet Anda. Mohon periksa poin-poin di bawah ini untuk menyelesaikan masalah.</p>
                    <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-lg">
                        <p className="font-bold">Pesan Error:</p>
                        <p className="text-sm font-mono mt-1">{connectionError || 'Tidak ada pesan error spesifik.'}</p>
                    </div>
                    <div>
                        <h4 className="font-bold text-slate-800 mb-2">Langkah-langkah Pengecekan:</h4>
                        <ul className="list-disc list-inside space-y-2 text-sm">
                            <li>
                                <strong>Verifikasi URL Web App:</strong> Pastikan URL di file <code>services/apiService.ts</code> sudah benar dan tidak ada salah ketik.
                            </li>
                            <li>
                                <strong>Periksa Deployment Apps Script:</strong> Buka Google Sheet, lalu ke menu <code>Extensions &gt; Apps Script</code>. Klik <code>Deploy &gt; Manage deployments</code>. Pastikan 'Who has access' diatur ke <strong>'Anyone'</strong>.
                            </li>
                             <li>
                                <strong>Deploy Ulang Skrip:</strong> Jika Anda baru saja mengubah kode di Apps Script, Anda <strong>HARUS</strong> melakukan <code>Deploy &gt; New deployment</code> dan menggunakan URL baru yang diberikan.
                            </li>
                             <li>
                                <strong>Buka URL di Browser:</strong> Coba buka URL Web App Anda langsung di browser. Jika Anda melihat halaman error dari Google, masalah ada pada skrip atau pengaturannya.
                            </li>
                             <li>
                                <strong>Masalah CORS/Jaringan:</strong> Jika pesan errornya adalah <code>NetworkError</code>, ini bisa disebabkan oleh kebijakan CORS. Coba nonaktifkan sementara ekstensi browser (seperti Ad-Blocker) atau coba gunakan browser lain untuk memastikan bukan itu masalahnya.
                            </li>
                        </ul>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default App;