'use client';

import React, { useState } from 'react';
import { X, Check } from 'lucide-react';

interface EditProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: { id: string; name: string };
  household: { id: string; name: string } | null;
  onSuccess: () => void;
}

export function EditProfileModal({
  isOpen,
  onClose,
  currentUser,
  household,
  onSuccess,
}: EditProfileModalProps) {
  const [name, setName] = useState(currentUser.name);
  const [householdName, setHouseholdName] = useState(household?.name || 'আমার পরিবার');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    try {
      const res = await fetch('/api/user', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: currentUser.id,
          name: name.trim(),
          householdId: household?.id,
          householdName: householdName.trim(),
        }),
      });

      if (res.ok) {
        onSuccess();
        onClose();
      } else {
        alert('নাম পরিবর্তনে সমস্যা হয়েছে');
      }
    } catch (err) {
      console.error(err);
      alert('সার্ভার এরর');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-md flex items-start justify-center pt-12 sm:pt-16 p-4 overflow-y-auto animate-backdrop-fade"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white rounded-3xl max-w-sm w-full p-5 sm:p-6 shadow-2xl border border-slate-100 animate-modal-pop my-auto sm:my-0"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="font-bold text-base text-slate-800">প্রোফাইল ও পরিবারের নাম পরিবর্তন</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              আপনার নাম (User Name) *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full text-sm px-3.5 py-2 border border-slate-200 rounded-xl focus:outline-emerald-500"
              placeholder="আপনার নাম লিখুন..."
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-600 mb-1">
              পরিবারের নাম (Family / Household)
            </label>
            <input
              type="text"
              value={householdName}
              onChange={(e) => setHouseholdName(e.target.value)}
              className="w-full text-sm px-3.5 py-2 border border-slate-200 rounded-xl focus:outline-emerald-500"
              placeholder="যেমন: আমাদের পরিবার"
            />
          </div>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2 text-xs font-semibold border border-slate-200 rounded-xl hover:bg-slate-50 transition"
            >
              বাতিল
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-2 text-xs font-semibold bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition disabled:opacity-50"
            >
              {loading ? 'সংরক্ষণ হচ্ছে...' : 'সেভ করুন'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
