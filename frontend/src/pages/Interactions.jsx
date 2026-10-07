import React, { useState, useEffect } from 'react';
import { fetchApi } from '../lib/api';
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Activity, MessageSquare, PhoneCall, Mail, Users as MeetingIcon, Search } from 'lucide-react';
import { Input } from "@/components/ui/input";
import { useNavigate } from 'react-router-dom';

export default function Interactions() {
  const [interactions, setInteractions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    loadInteractions();
  }, [search]);

  const loadInteractions = async () => {
    setLoading(true);
    try {
      const query = search ? `?search=${encodeURIComponent(search)}` : '';
      const res = await fetchApi(`/interactions${query}`);
      setInteractions(res.interactions || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (type) => {
    switch(type) {
      case 'call': return <PhoneCall className="w-4 h-4 text-emerald-400" />;
      case 'email': return <Mail className="w-4 h-4 text-blue-400" />;
      case 'meeting': return <MeetingIcon className="w-4 h-4 text-purple-400" />;
      default: return <MessageSquare className="w-4 h-4 text-indigo-400" />;
    }
  };

  return (
    <div className="p-6 md:p-8 space-y-6 h-full flex flex-col">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white mb-1">Company Activity Feed</h1>
          <p className="text-slate-400">All recent interactions, notes, and communications across all orders.</p>
        </div>
      </div>

      <div className="relative w-full sm:max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
        <Input 
          type="text"
          placeholder="Search by notes or user..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-slate-950/50 border-slate-800 text-slate-200 w-full rounded-lg"
        />
      </div>

      <div className="flex-1 overflow-auto">
        <Card className="glass-card border-slate-800/60 bg-slate-900/40 min-h-full">
          <div className="p-6">
            {loading ? (
              <div className="h-64 flex items-center justify-center">
                <Activity className="w-8 h-8 animate-spin text-indigo-500" />
              </div>
            ) : interactions.length === 0 ? (
              <div className="text-center py-12 text-slate-500">No activity found.</div>
            ) : (
              <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-800 before:to-transparent">
                {interactions.map((int) => (
                  <div key={int.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                    

                    <div className="flex items-center justify-center w-10 h-10 rounded-full border border-slate-700 bg-slate-900 text-slate-500 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow shadow-slate-900/50">
                      {getIcon(int.type)}
                    </div>
                    

                    <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border border-slate-800/50 bg-slate-900/50 hover:bg-slate-800/40 hover:border-slate-700 transition-colors shadow-lg cursor-pointer" onClick={() => navigate(`/orders/${int.order_id}`)}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-800 text-indigo-400 flex items-center justify-center text-xs font-bold shrink-0">
                            {int.user_name?.charAt(0)}
                          </div>
                          <span className="font-semibold text-slate-200 text-sm">{int.user_name}</span>
                        </div>
                        <time className="text-xs text-slate-500">{new Date(int.created_at).toLocaleString()}</time>
                      </div>
                      
                      <div className="text-slate-300 text-sm whitespace-pre-wrap mb-3">
                        {int.description || int.subject}
                      </div>
                      
                      <div className="flex items-center justify-between pt-3 border-t border-slate-800/50 text-xs">
                        <span className="text-slate-400">
                          Order: <span className="font-medium text-slate-300">{int.order_title}</span>
                        </span>
                        <span className="uppercase tracking-wider font-semibold text-slate-500">{int.type}</span>
                      </div>
                    </div>

                  </div>
                ))}
              </div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
