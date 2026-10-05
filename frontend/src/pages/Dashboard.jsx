import React, { useState, useEffect } from 'react';
import { useAuth } from '../App';
import { fetchApi } from '../lib/api';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell
} from 'recharts';
import { 
  Users, ShoppingCart, DollarSign, Activity, 
  TrendingUp, CheckCircle 
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  const { user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboard = async () => {
      try {
        const res = await fetchApi('/dashboard');
        setData(res);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-slate-400">
        <Activity className="w-10 h-10 animate-spin text-indigo-500 mb-4" />
        <p>Loading your workspace...</p>
      </div>
    );
  }

  const COLORS = ['#6366f1', '#a855f7', '#ec4899', '#f43f5e', '#f59e0b'];

  return (
    <div className="p-6 md:p-8 space-y-8">

      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Overview</h1>
        <p className="text-slate-400">Welcome back, {user.name}. Here's what's happening today.</p>
      </div>


      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard 
          title="Total Revenue" 
          value={`$${data.kpis.totalRevenue.toLocaleString()}`}
          icon={<DollarSign className="w-4 h-4 text-emerald-400" />}
          trend="+12% from last month"
        />
        <KPICard 
          title="Active Orders" 
          value={data.kpis.totalOrders}
          icon={<ShoppingCart className="w-4 h-4 text-indigo-400" />}
          trend={`${data.kpis.orders.in_progress} in progress`}
        />
        <KPICard 
          title="Total Clients" 
          value={data.kpis.totalClients}
          icon={<Users className="w-4 h-4 text-blue-400" />}
          trend="Active customer base"
        />
        <KPICard 
          title="Completed" 
          value={data.kpis.orders.completed}
          icon={<CheckCircle className="w-4 h-4 text-purple-400" />}
          trend={`$${data.kpis.completedRevenue.toLocaleString()} earned`}
        />
      </div>


      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="col-span-2 glass-card border-slate-800/60 bg-slate-900/40 p-6">
          <CardHeader className="mb-4">
            <CardTitle className="text-slate-200">Revenue Trend</CardTitle>
            <CardDescription className="text-slate-500">Last 6 months performance</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.charts.monthlyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                <XAxis dataKey="month" stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke="#94a3b8" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(val) => `$${val}`} />
                <Tooltip 
                  cursor={{fill: '#1e293b'}} 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                />
                <Bar dataKey="revenue" fill="#6366f1" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="glass-card border-slate-800/60 bg-slate-900/40 p-6">
          <CardHeader className="mb-4">
            <CardTitle className="text-slate-200">Order Status</CardTitle>
            <CardDescription className="text-slate-500">Current distribution</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px] flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.charts.ordersByStatus}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="count"
                  nameKey="status"
                  label
                >
                  {data.charts.ordersByStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                  itemStyle={{ color: '#e2e8f0' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>


      <Card className="glass-card border-slate-800/60 bg-slate-900/40 overflow-hidden p-6">
        <CardHeader className="mb-4">
          <CardTitle className="text-slate-200">Recent Orders</CardTitle>
          <CardDescription className="text-slate-500">Latest transactions in the system</CardDescription>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-400 uppercase bg-slate-900/50 border-y border-slate-800">
              <tr>
                <th className="px-6 py-4 font-medium">Order Title</th>
                <th className="px-6 py-4 font-medium">Client</th>
                <th className="px-6 py-4 font-medium">Status</th>
                <th className="px-6 py-4 font-medium">Amount</th>
                <th className="px-6 py-4 font-medium text-right">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {data.recentOrders.map((order) => (
                <tr key={order.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-200">{order.title}</td>
                  <td className="px-6 py-4 text-slate-400">{order.client_name}</td>
                  <td className="px-6 py-4">
                    <StatusBadge status={order.status} />
                  </td>
                  <td className="px-6 py-4 font-semibold text-slate-300">
                    ${order.total_amount.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right text-slate-500">
                    {new Date(order.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

function KPICard({ title, value, icon, trend }) {
  return (
    <Card className="glass-card border-slate-800/60 bg-slate-900/40 hover:bg-slate-800/40 transition-colors p-6">
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-slate-400">{title}</CardTitle>
        <div className="p-2 bg-slate-800/50 rounded-lg">{icon}</div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-slate-100">{value}</div>
        <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
          <TrendingUp className="w-3 h-3" /> {trend}
        </p>
      </CardContent>
    </Card>
  );
}

export function StatusBadge({ status }) {
  const styles = {
    pending: 'bg-amber-500/10 text-amber-500 border-amber-500/20',
    in_progress: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
    completed: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20',
    on_hold: 'bg-purple-500/10 text-purple-500 border-purple-500/20',
    cancelled: 'bg-red-500/10 text-red-500 border-red-500/20',
  };

  const labels = {
    pending: 'Pending',
    in_progress: 'In Progress',
    completed: 'Completed',
    on_hold: 'On Hold',
    cancelled: 'Cancelled'
  };

  return (
    <Badge variant="outline" className={`${styles[status] || styles.pending} rounded-full font-medium px-2.5 py-0.5`}>
      {labels[status] || status}
    </Badge>
  );
}
