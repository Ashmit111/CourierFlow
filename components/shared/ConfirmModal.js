'use client'

import { AlertTriangle, X } from 'lucide-react'

export default function ConfirmModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = "Confirm Action", 
  message = "Are you sure you want to proceed?",
  confirmText = "Confirm",
  cancelText = "Cancel",
  isDanger = true
}) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 400 }} onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            {isDanger && <AlertTriangle size={20} className="text-danger" />}
            <h3 style={{ fontSize: '1.25rem', fontFamily: 'var(--font-display)', fontWeight: 700 }}>{title}</h3>
          </div>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="modal-body">
          <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: 1.5, marginBottom: '1.5rem' }}>
            {message}
          </p>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost" onClick={onClose}>{cancelText}</button>
            <button className={`btn ${isDanger ? 'btn-primary' : 'btn-primary'}`} style={isDanger ? { background: 'var(--danger)', color: '#fff', borderColor: 'var(--danger)' } : {}} onClick={onConfirm}>
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
