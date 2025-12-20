'use client';

import { useState } from 'react';
import type { Feedback } from '@/lib/supabase';

interface FeedbackListProps {
  feedback: Feedback[];
  onReply: (id: string, email: string, name: string) => void;
  onStatusChange: (id: string, status: 'new' | 'replied' | 'resolved') => void;
}

export default function FeedbackList({ feedback, onReply, onStatusChange }: FeedbackListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [filter, setFilter] = useState<{ category: string; status: string }>({
    category: 'all',
    status: 'all',
  });

  const filteredFeedback = feedback.filter((item) => {
    if (filter.category !== 'all' && item.category !== filter.category) return false;
    if (filter.status !== 'all' && item.status !== filter.status) return false;
    return true;
  });

  const getCategoryBadge = (category: string) => {
    const colors: Record<string, string> = {
      bug: 'bg-red-100 text-red-800',
      feature: 'bg-blue-100 text-blue-800',
      general: 'bg-gray-100 text-gray-800',
    };
    return colors[category] || colors.general;
  };

  const getStatusBadge = (status: string) => {
    const colors: Record<string, string> = {
      new: 'bg-yellow-100 text-yellow-800',
      replied: 'bg-blue-100 text-blue-800',
      resolved: 'bg-green-100 text-green-800',
    };
    return colors[status] || colors.new;
  };

  return (
    <div>
      {/* Filters */}
      <div className="mb-6 flex flex-wrap gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
          <select
            value={filter.category}
            onChange={(e) => setFilter({ ...filter, category: e.target.value })}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="all">All Categories</option>
            <option value="bug">Bug</option>
            <option value="feature">Feature</option>
            <option value="general">General</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            value={filter.status}
            onChange={(e) => setFilter({ ...filter, status: e.target.value })}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="all">All Statuses</option>
            <option value="new">New</option>
            <option value="replied">Replied</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>
      </div>

      {/* Feedback List */}
      {filteredFeedback.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-gray-500">
          No feedback matches your filters
        </div>
      ) : (
        <div className="bg-white shadow overflow-hidden rounded-lg divide-y divide-gray-200">
          {filteredFeedback.map((item) => (
            <div key={item.id} className="p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-gray-900">{item.user_name}</span>
                    <span className={`px-2 py-1 text-xs rounded-full ${getCategoryBadge(item.category)}`}>
                      {item.category}
                    </span>
                    <span className={`px-2 py-1 text-xs rounded-full ${getStatusBadge(item.status)}`}>
                      {item.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-500 mt-1">{item.user_email}</p>
                </div>
                <div className="text-right text-sm text-gray-400">
                  <p>{new Date(item.created_at).toLocaleDateString()}</p>
                  <p>{new Date(item.created_at).toLocaleTimeString()}</p>
                </div>
              </div>

              {/* Message */}
              <div className="mb-4">
                <p className={`text-gray-700 ${expandedId !== item.id ? 'line-clamp-3' : ''}`}>
                  {item.message}
                </p>
                {item.message.length > 200 && (
                  <button
                    onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                    className="text-sm text-primary-600 hover:text-primary-700 mt-1"
                  >
                    {expandedId === item.id ? 'Show less' : 'Show more'}
                  </button>
                )}
              </div>

              {/* Video URL */}
              {item.video_url && (
                <div className="mb-4">
                  <a
                    href={item.video_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-sm text-primary-600 hover:text-primary-700"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    View Video
                  </a>
                </div>
              )}

              {/* Attachments */}
              {item.attachments && item.attachments.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm font-medium text-gray-700 mb-2">Attachments:</p>
                  <div className="flex flex-wrap gap-2">
                    {item.attachments.map((url, index) => (
                      <a
                        key={index}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center px-3 py-1 bg-gray-100 text-gray-700 rounded text-sm hover:bg-gray-200"
                      >
                        <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                        </svg>
                        Attachment {index + 1}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Metadata */}
              <div className="text-xs text-gray-400 mb-4">
                {item.app_version && <span>v{item.app_version}</span>}
                {item.os_info && <span className="ml-3">{item.os_info}</span>}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-3 border-t border-gray-100">
                <button
                  onClick={() => onReply(item.id, item.user_email, item.user_name)}
                  className="inline-flex items-center px-3 py-1.5 border border-primary-600 text-primary-600 rounded-md text-sm hover:bg-primary-50"
                >
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                  Reply
                </button>
                {item.status !== 'resolved' && (
                  <button
                    onClick={() => onStatusChange(item.id, 'resolved')}
                    className="inline-flex items-center px-3 py-1.5 border border-green-600 text-green-600 rounded-md text-sm hover:bg-green-50"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Mark Resolved
                  </button>
                )}
                {item.status === 'resolved' && (
                  <button
                    onClick={() => onStatusChange(item.id, 'new')}
                    className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-gray-600 rounded-md text-sm hover:bg-gray-50"
                  >
                    Reopen
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
