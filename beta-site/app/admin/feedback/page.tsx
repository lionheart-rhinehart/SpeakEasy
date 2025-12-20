'use client';

import { useEffect, useState } from 'react';
import FeedbackList from '@/components/admin/FeedbackList';
import type { Feedback } from '@/lib/supabase';

export default function FeedbackPage() {
  const [loading, setLoading] = useState(true);
  const [feedback, setFeedback] = useState<Feedback[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Reply modal state
  const [replyModal, setReplyModal] = useState<{
    open: boolean;
    feedbackId: string;
    email: string;
    name: string;
  } | null>(null);
  const [replyMessage, setReplyMessage] = useState('');
  const [sendingReply, setSendingReply] = useState(false);

  useEffect(() => {
    fetchFeedback();
  }, []);

  const fetchFeedback = async () => {
    try {
      const response = await fetch('/api/admin/feedback');
      if (!response.ok) throw new Error('Failed to fetch feedback');

      const data = await response.json();
      setFeedback(data.feedback);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleReply = (id: string, email: string, name: string) => {
    setReplyModal({ open: true, feedbackId: id, email, name });
    setReplyMessage('');
  };

  const sendReply = async () => {
    if (!replyModal || !replyMessage.trim()) return;

    setSendingReply(true);
    try {
      const response = await fetch('/api/admin/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feedbackId: replyModal.feedbackId,
          email: replyModal.email,
          name: replyModal.name,
          message: replyMessage,
        }),
      });

      if (!response.ok) throw new Error('Failed to send reply');

      // Update local state
      setFeedback((prev) =>
        prev.map((f) =>
          f.id === replyModal.feedbackId ? { ...f, status: 'replied' as const } : f
        )
      );

      setReplyModal(null);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to send reply');
    } finally {
      setSendingReply(false);
    }
  };

  const handleStatusChange = async (id: string, status: 'new' | 'replied' | 'resolved') => {
    try {
      const response = await fetch('/api/admin/reply', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedbackId: id, status }),
      });

      if (!response.ok) throw new Error('Failed to update status');

      // Update local state
      setFeedback((prev) =>
        prev.map((f) => (f.id === id ? { ...f, status } : f))
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update status');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
        {error}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Feedback</h1>
        <p className="text-gray-600 mt-1">
          {feedback.length} total submissions
        </p>
      </div>

      <FeedbackList
        feedback={feedback}
        onReply={handleReply}
        onStatusChange={handleStatusChange}
      />

      {/* Reply Modal */}
      {replyModal?.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Reply to {replyModal.name}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              Sending to: {replyModal.email}
            </p>
            <textarea
              value={replyMessage}
              onChange={(e) => setReplyMessage(e.target.value)}
              placeholder="Type your reply..."
              className="w-full h-40 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none"
              disabled={sendingReply}
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setReplyModal(null)}
                disabled={sendingReply}
                className="px-4 py-2 text-gray-700 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={sendReply}
                disabled={sendingReply || !replyMessage.trim()}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
              >
                {sendingReply ? 'Sending...' : 'Send Reply'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
