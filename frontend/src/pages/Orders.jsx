import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchApi } from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Activity, Plus, Search, Filter } from 'lucide-react';
import { StatusBadge } from './Dashboard';
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function Orders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');


  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    client_id: '',
    description: '',
    total_amount: '',
    priority: 'medium'
  });

  useEffect(() => {
    loadOrders();
    loadClients();
  }, [search, statusFilter]);

  const loadOrders = async () => {
    setLoading(true);
    try {
      let query = '?';
      if (search) query += `search=${encodeURIComponent(search)}&`;
      if (statusFilter) query += `status=${encodeURIComponent(statusFilter)}`;
      
      const res = await fetchApi(`/orders${query}`);
      setOrders(res.orders || []);
    } catch (err) {
      toast.error('Failed to load orders: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const loadClients = async () => {
    try {
      const res = await fetchApi('/clients');
      setClients(res.clients || []);
    } catch (err) {
      console.error('Failed to load clients', err);
    }
  };

  const handleAddOrder = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await fetchApi('/orders', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      toast.success('Order created successfully!');
      setIsDialogOpen(false);
      setFormData({ title: '', client_id: '', description: '', total_amount: '', priority: 'medium' });
      loadOrders();
    } catch (err) {
      toast.error(err.message || 'Failed to create order');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-1">Orders</h1>
          <p className="text-slate-400">Manage and track customer orders</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl transition-all">
              <Plus className="w-4 h-4" />
              <span>New Order</span>
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] bg-slate-950 border-slate-800 text-slate-200">
            <DialogHeader>
              <DialogTitle>Create New Order</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddOrder} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="title">Order Title *</Label>
                <Input 
                  id="title" 
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({...formData, title: e.target.value})}
                  className="bg-slate-900 border-slate-800" 
                  placeholder="e.g. Website Redesign"
                />
              </div>
              
              <div className="space-y-2">
                <Label>Client *</Label>
                <Select required value={formData.client_id} onValueChange={(val) => setFormData({...formData, client_id: val})}>
                  <SelectTrigger className="bg-slate-900 border-slate-800">
                    <SelectValue placeholder="Select a client" />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-950 border-slate-800 text-slate-200">
                    {clients.map(client => (
                      <SelectItem key={client.id} value={client.id.toString()}>
                        {client.name} {client.company ? `(${client.company})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Total Amount ($)</Label>
                  <Input 
                    id="amount" 
                    type="number"
                    min="0"
                    step="0.01"
                    value={formData.total_amount}
                    onChange={(e) => setFormData({...formData, total_amount: e.target.value})}
                    className="bg-slate-900 border-slate-800" 
                  />
                </div>
                <div className="space-y-2">
                  <Label>Priority</Label>
                  <Select value={formData.priority} onValueChange={(val) => setFormData({...formData, priority: val})}>
                    <SelectTrigger className="bg-slate-900 border-slate-800">
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-950 border-slate-800 text-slate-200">
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea 
                  id="description" 
                  value={formData.description}
                  onChange={(e) => setFormData({...formData, description: e.target.value})}
                  className="bg-slate-900 border-slate-800 resize-none h-24" 
                />
              </div>

              <DialogFooter className="pt-4">
                <button 
                  type="button" 
                  onClick={() => setIsDialogOpen(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg disabled:opacity-50"
                >
                  {isSubmitting ? 'Creating...' : 'Create Order'}
                </button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="glass-card border-slate-800/60 bg-slate-900/40 flex-1 flex flex-col overflow-hidden p-6">
        <CardHeader className="border-b border-slate-800/60 mb-4 pb-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input 
                type="text"
                placeholder="Search orders..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-slate-950/50 border-slate-800 text-slate-200 w-full rounded-lg"
              />
            </div>
            
            <div className="relative w-full sm:w-auto">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <select 
                className="w-full sm:w-48 pl-9 bg-slate-950/50 border border-slate-800 text-slate-200 rounded-lg py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none appearance-none"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="on_hold">On Hold</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </CardHeader>
        
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="h-64 flex items-center justify-center">
              <Activity className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-400 uppercase sticky top-0 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 z-10">
                <tr>
                  <th className="px-6 py-4 font-medium">Order Title</th>
                  <th className="px-6 py-4 font-medium">Client</th>
                  <th className="px-6 py-4 font-medium">Status</th>
                  <th className="px-6 py-4 font-medium">Priority</th>
                  <th className="px-6 py-4 font-medium">Amount</th>
                  <th className="px-6 py-4 font-medium text-right">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="text-center py-12 text-slate-500">
                      No orders found
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => (
                    <tr 
                      key={order.id} 
                      onClick={() => navigate(`/orders/${order.id}`)}
                      className="hover:bg-slate-800/30 transition-colors cursor-pointer group"
                    >
                      <td className="px-6 py-4 font-medium text-slate-200 group-hover:text-indigo-400 transition-colors">
                        {order.title}
                      </td>
                      <td className="px-6 py-4 text-slate-400">{order.client_name}</td>
                      <td className="px-6 py-4">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="px-6 py-4">
                        <span className={`capitalize text-xs font-medium px-2 py-1 rounded-md ${
                          order.priority === 'urgent' ? 'bg-red-500/10 text-red-400' :
                          order.priority === 'high' ? 'bg-orange-500/10 text-orange-400' :
                          'text-slate-400'
                        }`}>
                          {order.priority}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-semibold text-slate-300">
                        ${order.total_amount?.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right text-slate-500">
                        {new Date(order.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </Card>
    </div>
  );
}
