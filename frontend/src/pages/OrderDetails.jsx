import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchApi } from '../lib/api';
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Activity, ArrowLeft, Send, Calendar, User, AlignLeft, Flag } from 'lucide-react';
import { StatusBadge } from './Dashboard';
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export default function OrderDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);


  const [interactionNotes, setInteractionNotes] = useState('');
  const [interactionType, setInteractionType] = useState('note');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadOrderDetails();
  }, [id]);

  const loadOrderDetails = async () => {
    try {
      const res = await fetchApi(`/orders/${id}`);
      setOrder(res.order);
    } catch (err) {
      toast.error('Failed to load order: ' + err.message);
      navigate('/orders');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    try {
      await fetchApi(`/orders/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus })
      });
      toast.success('Status updated');
      setOrder({ ...order, status: newStatus });
    } catch (err) {
      toast.error('Failed to update status: ' + err.message);
    }
  };

  const handleAddInteraction = async (e) => {
    e.preventDefault();
    if (!interactionNotes.trim()) return;

    setIsSubmitting(true);
    try {
      await fetchApi('/interactions', {
        method: 'POST',
        body: JSON.stringify({
          order_id: id,
          type: interactionType,
          notes: interactionNotes
        })
      });
      toast.success('Interaction added');
      setInteractionNotes('');
      loadOrderDetails();
    } catch (err) {
      toast.error(err.message || 'Failed to add interaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Activity className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!order) return null;

  return (
    <div className="p-6 md:p-8 h-full flex flex-col overflow-auto">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6 w-fit"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Orders
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">


        <div className="lg:col-span-2 space-y-6">
          <Card className="glass-card border-slate-800/60 bg-slate-900/40 p-6">
            <CardHeader className="flex flex-row items-start justify-between">
              <div>
                <CardTitle className="text-2xl text-white mb-2">{order.title}</CardTitle>
                <CardDescription className="text-slate-400 flex items-center gap-4">
                  <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> {new Date(order.created_at).toLocaleDateString()}</span>
                  <span className="flex items-center gap-1"><User className="w-4 h-4" /> {order.client_name}</span>
                </CardDescription>
              </div>
              <div className="flex flex-col items-end gap-3">
                <div className="text-2xl font-bold text-emerald-400">
                  ${order.total_amount?.toLocaleString()}
                </div>
                <Select value={order.status} onValueChange={handleStatusChange}>
                  <SelectTrigger className="w-[140px] bg-slate-950 border-slate-700 h-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-950 border-slate-800 text-slate-200">
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="on_hold">On Hold</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h4 className="text-sm font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-2 mb-2">
                  <AlignLeft className="w-4 h-4" /> Description
                </h4>
                <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800 text-slate-300 whitespace-pre-wrap">
                  {order.description || <span className="text-slate-600 italic">No description provided.</span>}
                </div>
              </div>

              <div className="flex gap-6 border-t border-slate-800/50 pt-4">
                <div>
                  <h4 className="text-sm font-semibold text-slate-500 mb-1">Priority</h4>
                  <span className={`capitalize text-sm font-medium px-2.5 py-1 rounded-md ${order.priority === 'urgent' ? 'bg-red-500/10 text-red-400' :
                    order.priority === 'high' ? 'bg-orange-500/10 text-orange-400' :
                      'bg-slate-800 text-slate-300'
                    }`}>
                    {order.priority}
                  </span>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-500 mb-1">Manager</h4>
                  <span className="text-slate-300">{order.user_name}</span>
                </div>
              </div>
            </CardContent>
          </Card>


          <Card className="glass-card border-slate-800/60 bg-slate-900/40 p-6">
            <CardHeader>
              <CardTitle className="text-white">Interactions</CardTitle>
              <CardDescription>Notes, calls, and updates for this order</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">


              <form onSubmit={handleAddInteraction} className="space-y-3 bg-slate-950/50 p-4 rounded-xl border border-slate-800">
                <div className="flex items-center gap-3">
                  <Select value={interactionType} onValueChange={setInteractionType}>
                    <SelectTrigger className="w-[120px] bg-slate-900 border-slate-700">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-950 border-slate-800 text-slate-200">
                      <SelectItem value="note">Note</SelectItem>
                      <SelectItem value="call">Call</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="meeting">Meeting</SelectItem>
                    </SelectContent>
                  </Select>
                  <span className="text-sm text-slate-400">Add an update to this order</span>
                </div>
                <Textarea
                  placeholder={
                    interactionType === 'call' ? "Summarize the phone conversation..." :
                      interactionType === 'email' ? "Paste the email content or summary..." :
                        interactionType === 'meeting' ? "Write the meeting minutes or outcomes..." :
                          "Type your internal notes here..."
                  }
                  className="bg-slate-900 border-slate-700 resize-none"
                  value={interactionNotes}
                  onChange={(e) => setInteractionNotes(e.target.value)}
                />
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmitting || !interactionNotes.trim()}
                    className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <Send className="w-4 h-4" />
                    {interactionType === 'call' ? "Log Call" :
                      interactionType === 'email' ? "Log Email" :
                        interactionType === 'meeting' ? "Log Meeting" :
                          "Save Note"}
                  </button>
                </div>
              </form>


              <div className="space-y-4 pt-4">
                {order.interactions?.length === 0 ? (
                  <p className="text-center text-slate-500 py-4">No interactions yet.</p>
                ) : (
                  order.interactions?.map((int) => (
                    <div key={int.id} className="flex gap-4 p-4 rounded-xl hover:bg-slate-800/30 transition-colors border border-transparent hover:border-slate-800/50">
                      <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center shrink-0">
                        <span className="text-sm font-bold text-indigo-400">{int.user_name?.charAt(0)}</span>
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-slate-200">{int.user_name}</span>
                            <span className="text-xs uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-400 font-semibold">{int.type}</span>
                          </div>
                          <span className="text-xs text-slate-500">
                            {new Date(int.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-slate-300 text-sm whitespace-pre-wrap">{int.notes}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

            </CardContent>
          </Card>
        </div>


        <div className="space-y-6">
          <Card className="glass-card border-slate-800/60 bg-slate-900/40 p-6">
            <CardHeader className="mb-4">
              <CardTitle className="text-white">Client Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center shrink-0 border border-slate-700">
                  <span className="text-lg font-bold text-indigo-400">{order.client_name?.charAt(0)}</span>
                </div>
                <div>
                  <h3 className="font-medium text-slate-200">{order.client_name}</h3>
                  <button
                    onClick={() => navigate('/clients')}
                    className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    View full profile &rarr;
                  </button>
                </div>
              </div>


              <div className="bg-indigo-500/10 border border-indigo-500/20 p-4 rounded-xl text-sm text-indigo-200">
                Contact information can be found in the Clients tab.
              </div>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}
