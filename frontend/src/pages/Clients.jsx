import React, { useState, useEffect } from 'react';
import { fetchApi } from '../lib/api';
import { Card, CardHeader } from "@/components/ui/card";
import { Activity, Plus, Search, Mail, Phone, MapPin, Building } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function Clients() {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    company: '',
    address: ''
  });

  useEffect(() => {
    loadClients();
  }, [search]);

  const loadClients = async () => {
    setLoading(true);
    try {
      const query = search ? `?search=${encodeURIComponent(search)}` : '';
      const res = await fetchApi(`/clients${query}`);
      setClients(res.clients || []);
    } catch (err) {
      toast.error('Failed to load clients: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAddClient = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await fetchApi('/clients', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      toast.success('Client added successfully!');
      setIsDialogOpen(false);
      setFormData({ name: '', email: '', phone: '', company: '', address: '' });
      loadClients();
    } catch (err) {
      toast.error(err.message || 'Failed to add client');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-1">Clients</h1>
          <p className="text-slate-400">Manage customer relationships and data</p>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <button className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-xl transition-all">
              <Plus className="w-4 h-4" />
              <span>Add Client</span>
            </button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px] bg-slate-950 border-slate-800 text-slate-200">
            <DialogHeader>
              <DialogTitle>Add New Client</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAddClient} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input 
                  id="name" 
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="bg-slate-900 border-slate-800" 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input 
                  id="email" 
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({...formData, email: e.target.value})}
                  className="bg-slate-900 border-slate-800" 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input 
                  id="phone" 
                  value={formData.phone}
                  onChange={(e) => setFormData({...formData, phone: e.target.value})}
                  className="bg-slate-900 border-slate-800" 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company">Company</Label>
                <Input 
                  id="company" 
                  value={formData.company}
                  onChange={(e) => setFormData({...formData, company: e.target.value})}
                  className="bg-slate-900 border-slate-800" 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input 
                  id="address" 
                  value={formData.address}
                  onChange={(e) => setFormData({...formData, address: e.target.value})}
                  className="bg-slate-900 border-slate-800" 
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
                  {isSubmitting ? 'Saving...' : 'Save Client'}
                </button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="relative w-full sm:max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <Input 
          type="text"
          placeholder="Search by name, email, or company..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-slate-950/50 border-slate-800 text-slate-200 w-full rounded-lg"
        />
      </div>

      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <Activity className="w-8 h-8 animate-spin text-indigo-500" />
          </div>
        ) : clients.length === 0 ? (
          <div className="text-center py-12 text-slate-500">No clients found</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {clients.map((client) => (
              <Card key={client.id} className="glass-card border-slate-800/60 bg-slate-900/40 hover:border-indigo-500/50 transition-colors group cursor-pointer overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <CardHeader className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-xl text-indigo-400">
                        {client.name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-200 text-lg leading-tight group-hover:text-indigo-400 transition-colors">
                          {client.name}
                        </h3>
                        {client.company && (
                          <div className="flex items-center gap-1.5 text-slate-500 text-sm mt-1">
                            <Building className="w-3 h-3" />
                            <span>{client.company}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2 mt-4 pt-4 border-t border-slate-800/50">
                    {client.email && (
                      <div className="flex items-center gap-3 text-sm text-slate-400">
                        <Mail className="w-4 h-4 text-slate-500 shrink-0" />
                        <span className="truncate">{client.email}</span>
                      </div>
                    )}
                    {client.phone && (
                      <div className="flex items-center gap-3 text-sm text-slate-400">
                        <Phone className="w-4 h-4 text-slate-500 shrink-0" />
                        <span>{client.phone}</span>
                      </div>
                    )}
                    {client.address && (
                      <div className="flex items-center gap-3 text-sm text-slate-400">
                        <MapPin className="w-4 h-4 text-slate-500 shrink-0" />
                        <span className="truncate">{client.address}</span>
                      </div>
                    )}
                  </div>
                </CardHeader>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
