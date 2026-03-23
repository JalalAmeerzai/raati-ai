import React, { useEffect, useState } from 'react';
import Layout, { useTheme } from '../components/Layout';
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
    const { dark } = useTheme();

    useEffect(() => {
        axios.get('http://localhost:8000/analytics')
            .then(response => { setData(response.data); setLoading(false); })
            .catch(err => { console.error(err); setLoading(false); });
    }, []);

    if (loading) return <Layout title="Analytics"><div className="p-8">Loading...</div></Layout>;
    if (!data) return <Layout title="Analytics"><div className="p-8">No data available</div></Layout>;

    const cardBg = dark ? 'bg-[#181b23] border-gray-700/50' : 'bg-white border-gray-200';
    const txt = dark ? 'text-gray-100' : 'text-gray-900';
    const sub = dark ? 'text-gray-400' : 'text-gray-500';
    const sub2 = dark ? 'text-gray-600' : 'text-gray-400';

    const stats = [
        { title: 'Total Submissions', value: data.total_submissions, change: 'Lifetime', icon: FileText, color: dark ? 'text-purple-400' : 'text-purple-600', bg: dark ? 'bg-purple-500/10' : 'bg-purple-100' },
        { title: 'Average Score', value: `${data.average_score}/5`, change: 'Across all designs', icon: TrendingUp, color: dark ? 'text-blue-400' : 'text-blue-600', bg: dark ? 'bg-blue-500/10' : 'bg-blue-100' },
        { title: 'Standing', value: data.creative_standing, change: 'Exceeding Expectations', icon: Award, color: dark ? 'text-orange-400' : 'text-orange-600', bg: dark ? 'bg-orange-500/10' : 'bg-orange-100' },
    ];

    return (
        <Layout title="Jalal Ghaffar — Student Profile">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                {stats.map((stat, i) => (
                    <div key={i} className={`${cardBg} border p-6 rounded-xl shadow-sm transition-colors`}>
                        <div className="flex items-start justify-between">
                            <div>
                                <p className={`text-sm font-medium mb-1 ${sub}`}>{stat.title}</p>
                                <h3 className={`text-3xl font-bold ${txt}`}>{stat.value}</h3>
                                <p className={`text-xs mt-2 ${sub2}`}>{stat.change}</p>
                            </div>
                            <div className={`p-3 rounded-lg ${stat.bg} ${stat.color}`}>
                                <stat.icon size={24} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <div className={`${cardBg} border p-6 rounded-xl shadow-sm transition-colors`}>
                <h3 className={`text-lg font-semibold mb-6 ${txt}`}>Creativity Score Progress</h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data.trend}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={dark ? '#374151' : '#eee'} />
                            <XAxis dataKey="week" axisLine={false} tickLine={false} tick={{ fill: dark ? '#9ca3af' : '#888', fontSize: 12 }} dy={10} />
                            <YAxis hide domain={[0, 5]} />
                            <Tooltip
                                contentStyle={{
                                    borderRadius: '8px', border: 'none',
                                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                    backgroundColor: dark ? '#1e2130' : '#fff',
                                    color: dark ? '#e5e7eb' : '#111',
                                }}
                            />
                            <Line type="monotone" dataKey="score" stroke="#3b82f6" strokeWidth={3}
                                dot={{ stroke: '#3b82f6', strokeWidth: 2, r: 4, fill: dark ? '#181b23' : 'white' }}
                                activeDot={{ r: 6 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </Layout>
    );
};

export default Analytics;
