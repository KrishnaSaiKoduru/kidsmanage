import React, { useState, useRef } from 'react';
import { X, Save, User, Phone, MapPin, Briefcase, HeartPulse, ShieldAlert, Upload, Image as ImageIcon } from 'lucide-react';
import { api } from '../lib/api';

export default function ProfileModal({ user, onClose, onUpdate }) {
  const [formData, setFormData] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    avatarUrl: user?.avatarUrl || '',
    address: user?.address || '',
    emergencyContactName: user?.emergencyContactName || '',
    emergencyContactPhone: user?.emergencyContactPhone || '',
    emergencyContactRelation: user?.emergencyContactRelation || '',
    employer: user?.employer || '',
    authorizedPickups: user?.authorizedPickups || '',
    bio: user?.bio || '',
    jobTitle: user?.jobTitle || '',
    certifications: user?.certifications || '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 200;
        const MAX_HEIGHT = 200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        
        // Convert to webp to save space
        const dataUrl = canvas.toDataURL('image/webp', 0.8);
        setFormData(prev => ({ ...prev, avatarUrl: dataUrl }));
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const updatedUser = await api.patch('/auth/me', formData);
      onUpdate(updatedUser);
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const isParent = user?.role === 'PARENT';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in overflow-y-auto py-10">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col animate-slide-up my-auto">
        <div className="flex items-center justify-between p-5 border-b border-gray-100 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-800 z-10">
          <h2 className="text-xl font-bold text-gray-800 dark:text-white">Edit Profile</h2>
          <button onClick={onClose} className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-5 flex flex-col gap-6 overflow-y-auto max-h-[70vh]">
          {error && (
            <div className="p-3 bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-sm rounded-xl border border-red-100 dark:border-red-800/50 shrink-0">
              {error}
            </div>
          )}

          {/* Avatar Upload Section */}
          <div className="flex flex-col items-center gap-4 py-2 border-b border-gray-100 dark:border-gray-700 pb-6">
            <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-white dark:border-gray-700 shadow-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                {formData.avatarUrl ? (
                  <img src={formData.avatarUrl} alt="Profile Preview" className="w-full h-full object-cover" />
                ) : (
                  <User size={40} className="text-gray-400" />
                )}
              </div>
              <div className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Upload size={24} className="text-white" />
              </div>
            </div>
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImageUpload} 
              accept="image/*" 
              className="hidden" 
            />
            <div className="text-center">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">Profile Photo</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">Click image to upload new photo</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Basic Info */}
            <div className="md:col-span-2">
              <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider mb-3">Basic Information</h3>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Full Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User size={16} className="text-gray-400" />
                </div>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full pl-10 pr-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700/50 focus:bg-white dark:focus:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-800 dark:text-white"
                  placeholder="Your full name"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Phone Number</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Phone size={16} className="text-gray-400" />
                </div>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full pl-10 pr-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700/50 focus:bg-white dark:focus:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-800 dark:text-white"
                  placeholder="Your phone number"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Address</label>
              <div className="relative">
                <div className="absolute top-3 left-3 pointer-events-none">
                  <MapPin size={16} className="text-gray-400" />
                </div>
                <textarea
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full pl-10 pr-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700/50 focus:bg-white dark:focus:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-800 dark:text-white min-h-[80px]"
                  placeholder="Full residential address"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Employer / Company</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Briefcase size={16} className="text-gray-400" />
                </div>
                <input
                  type="text"
                  value={formData.employer}
                  onChange={(e) => setFormData({ ...formData, employer: e.target.value })}
                  className="w-full pl-10 pr-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700/50 focus:bg-white dark:focus:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-800 dark:text-white"
                  placeholder="Where do you work?"
                />
              </div>
            </div>

            {/* Emergency Contact */}
            <div className="md:col-span-2 mt-4 border-t border-gray-100 dark:border-gray-700 pt-4">
              <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider mb-3 flex items-center gap-2">
                <HeartPulse size={16} className="text-red-500" /> Emergency Contact
              </h3>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contact Name</label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.emergencyContactName}
                  onChange={(e) => setFormData({ ...formData, emergencyContactName: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700/50 focus:bg-white dark:focus:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-800 dark:text-white"
                  placeholder="Emergency contact name"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contact Phone</label>
              <div className="relative">
                <input
                  type="tel"
                  value={formData.emergencyContactPhone}
                  onChange={(e) => setFormData({ ...formData, emergencyContactPhone: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700/50 focus:bg-white dark:focus:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-800 dark:text-white"
                  placeholder="Emergency contact phone"
                />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Relationship to Child/You</label>
              <div className="relative">
                <input
                  type="text"
                  value={formData.emergencyContactRelation}
                  onChange={(e) => setFormData({ ...formData, emergencyContactRelation: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700/50 focus:bg-white dark:focus:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-800 dark:text-white"
                  placeholder="e.g. Grandparent, Aunt, Family Friend"
                />
              </div>
            </div>

            {/* Role Specific Fields */}
            {isParent && (
              <div className="md:col-span-2 mt-4 border-t border-gray-100 dark:border-gray-700 pt-4">
                <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <ShieldAlert size={16} className="text-blue-500" /> Authorized Pickups
                </h3>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">People authorized to pick up your child</label>
                <textarea
                  value={formData.authorizedPickups}
                  onChange={(e) => setFormData({ ...formData, authorizedPickups: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700/50 focus:bg-white dark:focus:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-800 dark:text-white min-h-[80px]"
                  placeholder="John Doe (Grandfather) - 555-0123, Jane Smith (Aunt) - 555-0124"
                />
              </div>
            )}

            {!isParent && (
              <div className="md:col-span-2 mt-4 border-t border-gray-100 dark:border-gray-700 pt-4 space-y-4">
                <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 uppercase tracking-wider mb-1 flex items-center gap-2">
                  <Briefcase size={16} className="text-blue-500" /> Professional Details
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Job Title</label>
                    <input
                      type="text"
                      value={formData.jobTitle}
                      onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700/50 focus:bg-white dark:focus:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-800 dark:text-white"
                      placeholder="e.g. Lead Teacher, Assistant"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Certifications</label>
                    <input
                      type="text"
                      value={formData.certifications}
                      onChange={(e) => setFormData({ ...formData, certifications: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700/50 focus:bg-white dark:focus:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-800 dark:text-white"
                      placeholder="e.g. CPR, First Aid"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Bio / Background</label>
                  <textarea
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700/50 focus:bg-white dark:focus:bg-gray-700 focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all text-gray-800 dark:text-white min-h-[100px]"
                    placeholder="Tell parents a bit about your experience and background..."
                  />
                </div>
              </div>
            )}

          </div>

          <div className="mt-4 flex justify-end gap-3 sticky bottom-0 bg-white dark:bg-gray-800 pt-4 border-t border-gray-100 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-600 dark:text-gray-300 font-medium hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 active:scale-95 transition-all disabled:opacity-70"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <Save size={18} />
              )}
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
