import React, { useEffect, useState } from 'react';
import Layout from '../components/Layout';
import axios from 'axios';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { FileText, TrendingUp, Award } from 'lucide-react';

interface AnalyticsData {
    total_submissions: number;
    average_score: number;
    trend: { week: string; score: number }[];
    creative_standing: string;
}

const Analytics: React.FC = () => {
    const [data, setData] = useState<AnalyticsData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        axios.get('http://localhost:8000/analytics')
            .then(response => {
                setData(response.data);
                setLoading(false);
            })
            .catch(err => {
                console.error(err);
                setLoading(false);
            });
    }, []);

    if (loading) return <Layout title="Analytics"><div className="p-8">Loading...</div></Layout>;
    if (!data) return <Layout title="Analytics"><div className="p-8">No data available</div></Layout>;

    const stats = [
        { title: 'Total Submissions', value: data.total_submissions, change: 'Lifetime', icon: FileText, color: 'text-purple-600', bg: 'bg-purple-100' },
        { title: 'Average Creativity Score', value: `${data.average_score}/5`, change: 'Across all designs', icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-100' },
        { title: 'Creative Standing', value: data.creative_standing, change: 'Exceeding Expectations', icon: Award, color: 'text-orange-600', bg: 'bg-orange-100' },
    ];

    return (
        <Layout title="Jalal Ghaffar - Student Profile">

            {/* Top Stat Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {stats.map((stat, index) => (
                    <div key={index} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-gray-500 text-sm font-medium mb-1">{stat.title}</p>
                                <h3 className="text-3xl font-bold text-gray-900">{stat.value}</h3>
                                <p className="text-xs text-gray-400 mt-2">{stat.change}</p>
                            </div>
                            <div className={`p-3 rounded-lg ${stat.bg} ${stat.color}`}>
                                <stat.icon size={24} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Progress Chart */}
                <div className="lg:col-span-3 bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-800 mb-6">Creativity Score Progress</h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={data.trend}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                                <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fill: '#888', fontSize: 12 }} dy={10} />
                                <YAxis hide domain={[0, 5]} />
                                <Tooltip
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                                />
                                <Line
                                    type="monotone"
                                    dataKey="score"
                                    stroke="#3b82f6"
                                    strokeWidth={3}
                                    dot={{ stroke: '#3b82f6', strokeWidth: 2, r: 4, fill: 'white' }}
                                    activeDot={{ r: 6 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

            </div>
        </Layout>
    );
};

export default Analytics;
