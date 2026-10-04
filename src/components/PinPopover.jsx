import React, { useState, useEffect, useRef } from 'react';
import { APP_CONFIG } from '../constants/config';
import { motion, AnimatePresence } from 'framer-motion';

// Helper function to hash PIN with SHA-256
const hashPin = async (pin) => {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

const PinPopover = ({ children, onSuccess, isOpen, setIsOpen, disabled = false }) => {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);
  const popoverRef = useRef(null);

  // Handle click outside to close
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, setIsOpen]);

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setPin('');
      setError(false);
    }
  }, [isOpen]);

  // Auto-submit when 4 digits are entered
  useEffect(() => {
    if (pin.length === 4) {
      const verifyPin = async () => {
        const hashedPin = await hashPin(pin);
        if (hashedPin === APP_CONFIG.PIN_CODE_SHA256) {
          setPin('');
          setIsOpen(false);
          onSuccess();
        } else {
          setError(true);
          setTimeout(() => {
            setPin('');
            setError(false);
          }, 800);
        }
      };
      verifyPin();
    }
  }, [pin, onSuccess, setIsOpen]);

  const handleNumpadClick = (num) => {
    if (pin.length < 4) {
      setPin(prev => prev + num);
      setError(false);
    }
  };

  const handleDelete = () => {
    setPin(prev => prev.slice(0, -1));
    setError(false);
  };

  return (
    <div style={{ position: 'relative', display: 'inline-block' }} ref={popoverRef}>
      {/* Trigger */}
      <div onClick={() => {
        if (!disabled) {
          setIsOpen(prev => !prev);
        }
      }}>
        {children}
      </div>

      {/* Popover Content */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="glass-card"
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              right: 0,
              borderRadius: '12px',
              padding: '16px',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
              border: '1px solid var(--border)',
              zIndex: 50,
              width: '220px'
            }}
          >
            <button
              onClick={() => setIsOpen(false)}
              style={{
                position: 'absolute',
                top: '12px',
                right: '12px',
                background: 'transparent',
                border: 'none',
                color: 'var(--text-muted)',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '50%',
                transition: 'all 0.2s ease',
              }}
              onMouseOver={(e) => {
                e.currentTarget.style.color = 'var(--text-main)';
                e.currentTarget.style.backgroundColor = 'var(--border)';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.color = 'var(--text-muted)';
                e.currentTarget.style.backgroundColor = 'transparent';
              }}
            >
              <i className="fa-solid fa-xmark" style={{ fontSize: '14px' }}></i>
            </button>

            <div style={{ textAlign: 'center', marginBottom: '16px' }}>
              <div style={{ fontSize: '14px', fontWeight: '500', marginBottom: '12px', color: 'var(--text-main)' }}>
                ใส่รหัส PIN
              </div>
              
              {/* Pin indicators */}
              <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
                {[0, 1, 2, 3].map((index) => (
                  <motion.div
                    key={index}
                    animate={error ? { x: [-5, 5, -5, 5, 0] } : {}}
                    transition={{ duration: 0.4 }}
                    style={{
                      width: '12px',
                      height: '12px',
                      borderRadius: '50%',
                      backgroundColor: pin.length > index ? 'var(--primary)' : 'var(--border)',
                      border: pin.length > index ? 'none' : '1px solid var(--border)',
                      boxShadow: pin.length > index ? '0 0 8px var(--primary-light)' : 'none'
                    }}
                  />
                ))}
              </div>
            </div>

            {/* Numpad */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map(num => (
                <button
                  key={num}
                  onClick={() => handleNumpadClick(num.toString())}
                  style={{
                    padding: '12px 0',
                    borderRadius: '8px',
                    border: 'none',
                    backgroundColor: 'var(--bg-main)',
                    color: 'var(--text-main)',
                    fontSize: '18px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--border)'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-main)'}
                  onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
                  onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                >
                  {num}
                </button>
              ))}
              <div></div> {/* Empty cell */}
              <button
                onClick={() => handleNumpadClick('0')}
                style={{
                  padding: '12px 0',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: 'var(--bg-main)',
                  color: 'var(--text-main)',
                  fontSize: '18px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'var(--border)'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-main)'}
                onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
                onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                0
              </button>
              <button
                onClick={handleDelete}
                style={{
                  padding: '12px 0',
                  borderRadius: '8px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: 'var(--text-muted)',
                  fontSize: '16px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease',
                }}
                onMouseOver={(e) => e.currentTarget.style.color = 'var(--text-main)'}
                onMouseOut={(e) => e.currentTarget.style.color = 'var(--text-muted)'}
                onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
                onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
              >
                <i className="fa-solid fa-delete-left"></i>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PinPopover;
