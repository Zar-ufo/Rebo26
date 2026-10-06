import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, BookOpen, AlertCircle, Sparkles, User } from 'lucide-react';

interface UserManualProps {
  onClose: () => void;
}

export const UserManual: React.FC<UserManualProps> = ({ onClose }) => {
  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BookOpen className="w-6 h-6 text-indigo-600" />
              rebo User Manual
            </h2>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors">
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>

          <div className="space-y-6 text-sm text-slate-600 dark:text-slate-300">
            <section>
              <h3 className="font-semibold text-slate-900 dark:text-white mb-2">How it works</h3>
              <p>rebo is an advanced AI research assistant. It takes your uploaded files (PDFs, docs, CSVs) and manual notes, processes the information securely, and provides synthesized meta-analysis, trend discovery, and academic context to help you research faster.</p>
            </section>

            <section>
              <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Rules</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>Always maintain professional scholarly conduct.</li>
                <li>Verify AI-generated summaries against your primary source files.</li>
                <li>Respect data privacy when uploading sensitive documents.</li>
              </ul>
            </section>

            <section>
              <h3 className="font-semibold text-slate-900 dark:text-white mb-2">Limits</h3>
              <p>While powerful, rebo is an assistant. It may occasionally misinterpret highly specialized data. Always review final reports for accuracy. Processing speed depends on file size and document complexity.</p>
            </section>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500">
            <p className="flex items-center gap-2 font-medium text-slate-700 dark:text-slate-300">
              <User className="w-4 h-4" />
              Made with passion by Abdullah Zarif (Zarufo)
            </p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};
