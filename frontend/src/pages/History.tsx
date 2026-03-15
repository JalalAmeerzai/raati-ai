import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
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

    useEffect(() => {
        axios.get('http://localhost:8000/history')
            .then(response => {
                setHistory(response.data);
            })
            .catch(err => console.error(err));
    }, []);

    const formatDate = (isoString: string) => {
        return new Date(isoString).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric'
        });
    };

    return (
        <Layout title="Submission History">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">

                {/* Filters Header */}
                <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                    <h3 className="font-semibold text-gray-700">All Submissions</h3>
                    <div className="flex space-x-2">
                        <div className="flex items-center space-x-2 bg-white border border-gray-300 rounded-md px-3 py-1.5 text-sm text-gray-600">
                            <Calendar size={14} />
                            <span>Oct 1, 2023 - Oct 31, 2023</span>
                        </div>
                        <button className="bg-blue-600 text-white px-3 py-1.5 rounded-md text-sm font-medium flex items-center space-x-1 hover:bg-blue-700">
                            <Filter size={14} />
                            <span>Apply Filters</span>
                        </button>
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead>
                            <tr className="bg-gray-50 text-gray-600 text-sm border-b border-gray-200">
                                <th className="px-6 py-4 font-medium">Date</th>
                                <th className="px-6 py-4 font-medium">Sketch Title / Description</th>
                                <th className="px-6 py-4 font-medium">Score</th>
                                <th className="px-6 py-4 font-medium">Status</th>
                                <th className="px-6 py-4 font-medium">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {history.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">No submissions yet.</td>
                                </tr>
                            ) : (
                                history.map((item) => (
                                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 text-sm text-gray-700 font-medium">
                                            {formatDate(item.timestamp)}
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600 max-w-xs truncate">
                                            {item.description}
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${parseFloat(item.overall_score) >= 4 ? 'bg-green-100 text-green-800' :
                                                parseFloat(item.overall_score) >= 2.5 ? 'bg-yellow-100 text-yellow-800' :
                                                    'bg-red-100 text-red-800'
                                                }`}>
                                                {item.overall_score}/5
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex items-center text-green-600 text-sm font-medium">
                                                <CheckCircle size={16} className="mr-1.5" />
                                                Processed
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => navigate(`/results/${item.id}`)}
                                                className="text-blue-600 hover:text-blue-800 text-sm font-medium border border-blue-200 bg-blue-50 px-3 py-1 rounded hover:bg-blue-100"
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

                {/* Pagination Footer */}
                <div className="p-4 border-t border-gray-200 bg-gray-50 flex justify-end text-sm text-gray-500">
                    Showing 1-{history.length} of {history.length} results
                </div>

            </div>
        </Layout>
    );
};

export default History;
