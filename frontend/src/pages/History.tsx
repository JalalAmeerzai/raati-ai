import React, { useEffect, useState, useMemo } from 'react';
import Layout, { useTheme } from '../components/Layout';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Search, CheckCircle, X, ChevronUp, ChevronDown, ArrowRight } from 'lucide-react';

interface HistoryItem {
    id: string;
    timestamp: string;
    image_filename: string;
    description: string;
    overall_score: string | number;
    image_url: string;
    submitter_name?: string;
}

const getInitials = (name?: string) => {
    if (!name || !name.trim()) return 'AN';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

const avatarColors = [
    'bg-blue-500', 'bg-emerald-500', 'bg-violet-500', 'bg-amber-500',
    'bg-rose-500', 'bg-cyan-500', 'bg-indigo-500', 'bg-teal-500',
];
const getAvatarColor = (name?: string) => {
    if (!name) return avatarColors[0];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return avatarColors[Math.abs(hash) % avatarColors.length];
};

type SortField = 'id' | 'timestamp' | 'overall_score';
type SortDir = 'asc' | 'desc';

const History: React.FC = () => {
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const navigate = useNavigate();
    const { dark } = useTheme();

    // Filter states
    const [searchQuery, setSearchQuery] = useState('');
    const [scoreFilter, setScoreFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');
    const [dateFilter, setDateFilter] = useState<'all' | '7d' | '30d' | '90d'>('all');

    // Sort states
    const [sortField, setSortField] = useState<SortField>('timestamp');
    const [sortDir, setSortDir] = useState<SortDir>('desc');

    useEffect(() => {
        axios.get('http://localhost:8000/history')
            .then(response => setHistory(response.data))
            .catch(err => console.error(err));
    }, []);

    const filteredAndSortedHistory = useMemo(() => {
        // 1. Filter
        let result = history.filter(item => {
            if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase();
                const matchesName = (item.submitter_name || '').toLowerCase().includes(q);
                const matchesDesc = (item.description || '').toLowerCase().includes(q);
                if (!matchesName && !matchesDesc) return false;
            }

            if (scoreFilter !== 'all') {
                const score = item.overall_score != null ? parseFloat(String(item.overall_score)) : NaN;
                if (isNaN(score)) return false;
                if (scoreFilter === 'high' && score < 4) return false;
                if (scoreFilter === 'medium' && (score < 2.5 || score >= 4)) return false;
                if (scoreFilter === 'low' && score >= 2.5) return false;
            }

            if (dateFilter !== 'all') {
                const now = Date.now();
                const ts = new Date(item.timestamp).getTime();
                const days = dateFilter === '7d' ? 7 : dateFilter === '30d' ? 30 : 90;
                if (now - ts > days * 86400000) return false;
            }

            return true;
        });

        // 2. Sort
        result.sort((a, b) => {
            let cmp = 0;
            if (sortField === 'timestamp') {
                cmp = new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
            } else if (sortField === 'id') {
                cmp = a.id.localeCompare(b.id);
            } else if (sortField === 'overall_score') {
                const sa = a.overall_score != null && a.overall_score !== '' ? parseFloat(String(a.overall_score)) : -1;
                const sb = b.overall_score != null && b.overall_score !== '' ? parseFloat(String(b.overall_score)) : -1;
                cmp = sa - sb;
            }
            return sortDir === 'asc' ? cmp : -cmp;
        });

        return result;
    }, [history, searchQuery, scoreFilter, dateFilter, sortField, sortDir]);

    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDir('desc');
        }
    };

    const formatDate = (isoString: string) =>
        new Date(isoString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });

    const activeFiltersCount = [
        searchQuery.trim() ? 1 : 0,
        scoreFilter !== 'all' ? 1 : 0,
        dateFilter !== 'all' ? 1 : 0,
    ].reduce((a, b) => a + b, 0);

    const clearFilters = () => {
        setSearchQuery('');
        setScoreFilter('all');
        setDateFilter('all');
        setSortField('timestamp');
        setSortDir('desc');
    };

    const SortIcon = ({ field }: { field: SortField }) => {
        if (sortField !== field) return <div className="w-3" />;
        return sortDir === 'asc' ? <ChevronUp size={14} className="text-blue-500" /> : <ChevronDown size={14} className="text-blue-500" />;
    };

    const cardBg = dark ? 'bg-[#181b23] border-gray-700/50' : 'bg-white border-gray-200';
    const headerBg = dark ? 'bg-[#12141c]' : 'bg-gray-50';
    const rowHover = dark ? 'hover:bg-[#1e2130]' : 'hover:bg-gray-50';
    const txt = dark ? 'text-gray-100' : 'text-gray-800';
    const sub = dark ? 'text-gray-400' : 'text-gray-600';
    const divider = dark ? 'divide-gray-700/50' : 'divide-gray-100';
    const border = dark ? 'border-gray-700/50' : 'border-gray-200';
    const inputBg = dark ? 'bg-[#12141c] border-gray-700 text-gray-200 placeholder-gray-600' : 'bg-white border-gray-300 text-gray-700';
    const selectBg = dark ? 'bg-[#12141c] border-gray-700 text-gray-300' : 'bg-white border-gray-300 text-gray-700';
    const chipActive = dark ? 'bg-blue-500/15 text-blue-400 border-blue-500/30' : 'bg-blue-50 text-blue-700 border-blue-200';
    const chipInactive = dark ? 'bg-[#12141c] text-gray-400 border-gray-700 hover:border-gray-600' : 'bg-white text-gray-500 border-gray-300 hover:border-gray-400';

    return (
        <Layout title="Submission History">
            <div className={`${cardBg} border rounded-xl shadow-sm transition-colors`}>

                {/* Header + Filters */}
                <div className={`p-4 border-b ${border} ${headerBg} rounded-t-xl`}>
                    <div className="flex justify-between items-center mb-3">
                        <h3 className={`font-semibold ${txt}`}>All Submissions</h3>
                        <div className="flex items-center gap-3">
                            {activeFiltersCount > 0 && (
                                <button onClick={clearFilters} className={`text-xs font-medium flex items-center gap-1 px-2 py-1 rounded transition-colors ${dark ? 'text-gray-400 hover:text-gray-200 hover:bg-gray-700/50' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'}`}>
                                    <X size={12} /> Clear {activeFiltersCount} filter{activeFiltersCount > 1 ? 's' : ''}
                                </button>
                            )}
                        </div>
                    </div>
                    <div className="flex flex-wrap gap-2 items-center">
                        {/* Search */}
                        <div className="relative flex-1 min-w-[200px]">
                            <Search size={14} className={`absolute left-3 top-1/2 -translate-y-1/2 ${dark ? 'text-gray-600' : 'text-gray-400'}`} />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Search by name or description..."
                                className={`w-full pl-9 pr-3 py-1.5 text-sm rounded-md border focus:ring-blue-500 focus:border-blue-500 transition-colors ${inputBg}`}
                            />
                        </div>

                        {/* Score filter */}
                        <select
                            value={scoreFilter}
                            onChange={e => setScoreFilter(e.target.value as any)}
                            className={`text-sm rounded-md border px-3 py-1.5 cursor-pointer transition-colors ${selectBg}`}
                        >
                            <option value="all">All Scores</option>
                            <option value="high">High (≥ 4.0)</option>
                            <option value="medium">Medium (2.5 – 3.9)</option>
                            <option value="low">Low (&lt; 2.5)</option>
                        </select>

                        {/* Date filter chips */}
                        {(['all', '7d', '30d', '90d'] as const).map(d => (
                            <button
                                key={d}
                                onClick={() => setDateFilter(d)}
                                className={`text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${dateFilter === d ? chipActive : chipInactive}`}
                            >
                                {d === 'all' ? 'All Time' : d === '7d' ? 'Last 7 days' : d === '30d' ? 'Last 30 days' : 'Last 90 days'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-visible">
                    <table className="w-full text-left">
                        <thead>
                            <tr className={`${headerBg} ${sub} text-sm border-b ${border}`}>
                                {/* ID Header (Sortable) */}
                                <th 
                                    className={`px-5 py-3 font-medium cursor-pointer select-none transition-colors ${dark ? 'hover:text-gray-200' : 'hover:text-gray-900'}`}
                                    onClick={() => handleSort('id')}
                                >
                                    <div className="flex items-center gap-1">ID <SortIcon field="id" /></div>
                                </th>

                                {/* Date Header (Sortable) */}
                                <th 
                                    className={`px-5 py-3 font-medium cursor-pointer select-none transition-colors ${dark ? 'hover:text-gray-200' : 'hover:text-gray-900'}`}
                                    onClick={() => handleSort('timestamp')}
                                >
                                    <div className="flex items-center gap-1">Date <SortIcon field="timestamp" /></div>
                                </th>

                                {/* Student Header (Fixed) */}
                                <th className="px-5 py-3 font-medium w-12 text-center">Student</th>

                                {/* Description Header (Fixed) */}
                                <th className="px-5 py-3 font-medium">Description</th>

                                {/* Score Header (Sortable) */}
                                <th 
                                    className={`px-5 py-3 font-medium cursor-pointer select-none transition-colors ${dark ? 'hover:text-gray-200' : 'hover:text-gray-900'}`}
                                    onClick={() => handleSort('overall_score')}
                                >
                                    <div className="flex items-center gap-1">Score <SortIcon field="overall_score" /></div>
                                </th>

                                <th className="px-5 py-3 font-medium">Status</th>
                                <th className="px-5 py-3 font-medium">Action</th>
                            </tr>
                        </thead>
                        <tbody className={`${divider} divide-y`}>
                            {filteredAndSortedHistory.length === 0 ? (
                                <tr><td colSpan={7} className={`px-6 py-8 text-center ${sub}`}>
                                    {history.length > 0 ? 'No submissions match your filters.' : 'No submissions yet.'}
                                </td></tr>
                            ) : (
                                filteredAndSortedHistory.map((item, index) => (
                                    <tr key={item.id} className={`${rowHover} transition-colors`}>
                                        
                                        {/* 1. ID */}
                                        <td className="px-5 py-3">
                                            <span className={`text-xs font-mono px-2 py-1 rounded bg-black/5 dark:bg-white/5 ${sub}`}>
                                                {item.id.split('-')[0]}
                                            </span>
                                        </td>

                                        {/* 2. Date */}
                                        <td className={`px-5 py-3 text-sm font-medium whitespace-nowrap ${txt}`}>{formatDate(item.timestamp)}</td>

                                        {/* 3. Student Avatar */}
                                        <td className="px-5 py-3 flex justify-center relative hover:z-[100]">
                                            <div className="relative group cursor-help mt-1">
                                                <div className={`h-8 w-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white shadow-sm border border-black/10 dark:border-white/10 ${getAvatarColor(item.submitter_name)}`}>
                                                    {getInitials(item.submitter_name)}
                                                </div>
                                                <div className={`absolute left-1/2 -translate-x-1/2 px-3 py-1.5 text-xs font-bold rounded-md shadow-2xl whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50 ${dark ? 'bg-white text-gray-900' : 'bg-gray-900 text-white'} ${index < 4 ? 'top-full mt-2' : 'bottom-full mb-2'}`}>
                                                    {item.submitter_name?.trim() || 'Anonymous'}
                                                    <div className={`absolute left-1/2 -translate-x-1/2 border-4 border-transparent ${index < 4 ? `bottom-full ${dark ? 'border-b-white' : 'border-b-gray-900'}` : `top-full ${dark ? 'border-t-white' : 'border-t-gray-900'}`}`} />
                                                </div>
                                            </div>
                                        </td>

                                        {/* 4. Description (with Tooltip) */}
                                        <td className={`px-5 py-3 text-sm ${sub} relative hover:z-[100]`}>
                                            <div className="relative group/desc w-full max-w-[200px] sm:max-w-[280px]">
                                                <div className="truncate cursor-help w-full">{item.description}</div>
                                                <div className={`absolute left-0 w-[300px] max-w-[80vw] p-3 text-xs rounded-lg shadow-2xl border opacity-0 group-hover/desc:opacity-100 transition-opacity pointer-events-none z-50 hidden md:block whitespace-normal leading-relaxed ${dark ? 'bg-[#fcfdfd] text-gray-800 border-gray-200' : 'bg-gray-900 text-gray-100 border-gray-800'} ${index < 4 ? 'top-full mt-2' : 'bottom-full mb-2'}`}>
                                                    {item.description}
                                                    <div className={`absolute left-4 border-[5px] border-transparent ${index < 4 ? `bottom-full ${dark ? 'border-b-gray-200' : 'border-b-gray-800'}` : `top-full ${dark ? 'border-t-gray-200' : 'border-t-gray-800'}`}`} />
                                                    <div className={`absolute left-[17px] border-4 border-transparent ${index < 4 ? `bottom-full ${dark ? 'border-b-[#fcfdfd]' : 'border-b-gray-900'}` : `top-full ${dark ? 'border-t-[#fcfdfd]' : 'border-t-gray-900'}`}`} />
                                                </div>
                                            </div>
                                        </td>

                                        {/* 5. Score */}
                                        <td className="px-5 py-3">
                                            {item.overall_score != null && item.overall_score !== '' ? (
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                                                    parseFloat(String(item.overall_score)) >= 4
                                                        ? (dark ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-green-100 text-green-800 border-green-200')
                                                        : parseFloat(String(item.overall_score)) >= 2.5
                                                            ? (dark ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' : 'bg-yellow-100 text-yellow-800 border-yellow-200')
                                                            : (dark ? 'bg-red-500/10 text-red-400 border-red-500/20' : 'bg-red-100 text-red-800 border-red-200')
                                                }`}>
                                                    {parseFloat(String(item.overall_score)).toFixed(1)}/5
                                                </span>
                                            ) : (
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${dark ? 'bg-gray-700/50 text-gray-400 border-gray-600' : 'bg-gray-100 text-gray-500 border-gray-200'}`}>—/5</span>
                                            )}
                                        </td>

                                        {/* 6. Status */}
                                        <td className="px-5 py-3">
                                            <div className="flex items-center text-emerald-500 text-sm font-medium">
                                                <CheckCircle size={16} className="mr-1.5 opacity-80" /> Processed
                                            </div>
                                        </td>

                                        {/* 7. Action */}
                                        <td className="px-5 py-3 text-right">
                                            <button
                                                onClick={() => navigate(`/results/${item.id}`)}
                                                className={`group inline-flex items-center justify-center h-8 px-4 text-[11px] font-bold uppercase tracking-wider rounded-full border transition-all duration-300 ${
                                                    dark 
                                                    ? 'bg-transparent border-gray-700 text-gray-300 hover:border-blue-500/50 hover:bg-blue-500/10 hover:text-blue-400' 
                                                    : 'bg-transparent border-gray-200 text-gray-600 hover:border-blue-200 hover:bg-blue-50 hover:text-blue-600'
                                                }`}
                                            >
                                                View Details
                                                <ArrowRight size={13} strokeWidth={2.5} className="opacity-0 -ml-4 group-hover:opacity-100 group-hover:translate-x-1 group-hover:ml-1.5 transition-all duration-300 pointer-events-none" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer */}
                <div className={`p-4 border-t ${border} ${headerBg} flex justify-between text-sm ${sub} rounded-b-xl`}>
                    <span>Showing {filteredAndSortedHistory.length} of {history.length} submissions</span>
                    {activeFiltersCount > 0 && <span className={`text-xs ${dark ? 'text-blue-400' : 'text-blue-600'}`}>{activeFiltersCount} active filter{activeFiltersCount > 1 ? 's' : ''}</span>}
                </div>
            </div>
        </Layout>
    );
};

export default History;
