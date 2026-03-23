import React, { useEffect, useState } from 'react';
import Layout, { useTheme } from '../components/Layout';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Calendar, Filter, CheckCircle } from 'lucide-react';

interface HistoryItem {
    id: string;
    timestamp: string;
    image_filename: string;
    description: string;
    overall_score: string;
    image_url: string;
}

const History: React.FC = () => {
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const navigate = useNavigate();
    const { dark } = useTheme();

    useEffect(() => {
        axios.get('http://localhost:8000/history')
            .then(response => setHistory(response.data))
            .catch(err => console.error(err));
    }, []);

    const formatDate = (isoString: string) =>
        new Date(isoString).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    const cardBg = dark ? 'bg-[#181b23] border-gray-700/50' : 'bg-white border-gray-200';
    const headerBg = dark ? 'bg-[#12141c]' : 'bg-gray-50';
    const rowHover = dark ? 'hover:bg-[#1e2130]' : 'hover:bg-gray-50';
    const txt = dark ? 'text-gray-100' : 'text-gray-800';
    const sub = dark ? 'text-gray-400' : 'text-gray-600';
    const divider = dark ? 'divide-gray-700/50' : 'divide-gray-100';
    const border = dark ? 'border-gray-700/50' : 'border-gray-200';

    return (
        <Layout title="Submission History">
            <div className={`${cardBg} border rounded-xl shadow-sm overflow-hidden transition-colors`}>

                {/* Header */}
                <div className={`p-4 border-b ${border} ${headerBg} flex justify-between items-center`}>
                    <h3 className={`font-semibold ${txt}`}>All Submissions</h3>
                    <div className="flex space-x-2">
                        <div className={`flex items-center space-x-2 border rounded-md px-3 py-1.5 text-sm ${dark ? 'bg-[#181b23] border-gray-700 text-gray-400' : 'bg-white border-gray-300 text-gray-600'}`}>
                            <Calendar size={14} />
                            <span>All Time</span>
                        </div>
                        <button className="bg-blue-600 text-white px-3 py-1.5 rounded-md text-sm font-medium flex items-center space-x-1 hover:bg-blue-500">
                            <Filter size={14} /><span>Apply Filters</span>
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className={`${headerBg} ${sub} text-sm border-b ${border}`}>
                                <th className="px-6 py-4 font-medium">Date</th>
                                <th className="px-6 py-4 font-medium">Description</th>
                                <th className="px-6 py-4 font-medium">Score</th>
                                <th className="px-6 py-4 font-medium">Status</th>
                                <th className="px-6 py-4 font-medium">Action</th>
                            </tr>
                        </thead>
                        <tbody className={`${divider} divide-y`}>
                            {history.length === 0 ? (
                                <tr><td colSpan={5} className={`px-6 py-8 text-center ${sub}`}>No submissions yet.</td></tr>
                            ) : (
                                history.map((item) => (
                                    <tr key={item.id} className={`${rowHover} transition-colors`}>
                                        <td className={`px-6 py-4 text-sm font-medium ${txt}`}>{formatDate(item.timestamp)}</td>
                                        <td className={`px-6 py-4 text-sm max-w-xs truncate ${sub}`}>{item.description}</td>
                                        <td className="px-6 py-4">
                                            {item.overall_score ? (
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                    parseFloat(item.overall_score) >= 4
                                                        ? (dark ? 'bg-green-500/10 text-green-400' : 'bg-green-100 text-green-800')
                                                        : parseFloat(item.overall_score) >= 2.5
                                                            ? (dark ? 'bg-yellow-500/10 text-yellow-400' : 'bg-yellow-100 text-yellow-800')
                                                            : (dark ? 'bg-red-500/10 text-red-400' : 'bg-red-100 text-red-800')
                                                }`}>
                                                    {parseFloat(item.overall_score).toFixed(1)}/5
                                                </span>
                                            ) : (
                                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${dark ? 'bg-gray-700 text-gray-400' : 'bg-gray-100 text-gray-500'}`}>—/5</span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center text-green-500 text-sm font-medium">
                                                <CheckCircle size={16} className="mr-1.5" /> Processed
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => navigate(`/results/${item.id}`)}
                                                className={`text-sm font-medium border px-3 py-1 rounded transition-colors ${
                                                    dark ? 'text-blue-400 border-blue-500/30 bg-blue-500/10 hover:bg-blue-500/20' : 'text-blue-600 border-blue-200 bg-blue-50 hover:bg-blue-100'
                                                }`}
                                            >
                                                View Details
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Footer */}
                <div className={`p-4 border-t ${border} ${headerBg} flex justify-end text-sm ${sub}`}>
                    Showing 1-{history.length} of {history.length} results
                </div>
            </div>
        </Layout>
    );
};

export default History;
