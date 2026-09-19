import React, { useState, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DatePicker from 'react-datepicker';
import Select from 'react-select';
import { UPDATE_API_URL } from '../constants/api';
import { statusOptions, shariahOptions } from '../constants/options';
import { statusSelectStyles } from '../constants/styles';
import { parseNumber, calculateTargetAmount, formatCurrency } from '../utils/numberUtils';
import { parseDate, formatDate } from '../utils/dateUtils';

export default function UpdateModal({ stock, exchangeRate = 36.5, onClose, onUpdateSuccess }) {
  const tvMarket = (stock["ตลาด"] || '').trim().toUpperCase();
  const tvTicker = (stock["ชื่อหุ้น"] || '').trim().toUpperCase();
  const tradingViewUrl = tvMarket && tvTicker 
    ? `https://th.tradingview.com/symbols/${tvMarket}-${tvTicker}/` 
    : (stock["TradingView"] || `https://th.tradingview.com/symbols/${tvTicker}/`);

  const targetPrice = parseNumber(stock["ราคาตั้งซื้อ ($)"]);
  const targetAmount = targetPrice > 0 ? calculateTargetAmount(stock["วันที่กำหนด"], stock["ราคาตั้งซื้อ ($)"]) : 0;
  const rawRemainingTarget = (stock.port === 'Trade' || targetPrice <= 0)
    ? 0
    : targetAmount - parseNumber(stock["ยอดซื้อ ($)"]) + parseNumber(stock["ยอดขาย ($)"]);
  const remainingTarget = Math.round(rawRemainingTarget * 100) / 100;

  const originalBuyDate = stock["วันที่ซื้อล่าสุด"] ? formatDate(stock["วันที่ซื้อล่าสุด"]) : 'ไม่มี';
  const originalSellDate = stock["วันที่ขายล่าสุด"] ? formatDate(stock["วันที่ขายล่าสุด"]) : 'ไม่มี';
  const originalDividendDate = stock["วันที่ปันผลล่าสุด"] ? formatDate(stock["วันที่ปันผลล่าสุด"]) : 'ไม่มี';

  const formatOriginalMoney = (val) => {
    const num = parseNumber(val);
    return num < 0 
      ? `-$${Math.abs(num).toLocaleString(undefined, { minimumFractionDigits: 2 })}` 
      : `$${num.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;
  };

  const originalBuyAmount = formatOriginalMoney(stock["ยอดซื้อ ($)"]);
  const originalSellAmount = formatOriginalMoney(stock["ยอดขาย ($)"]);
  const originalDividendAmount = formatOriginalMoney(stock["ยอดปันผล ($)"]);
  
  const origTax = stock["ภาษีปันผล ($)"] || stock["ภาษี ($)"] || stock["ยอดภาษี ($)"] || 0;
  const originalTaxAmount = formatOriginalMoney(origTax);
  
  const origClear = stock["ยอดกำจัด ($)"] || stock["clear_amount"] || 0;
  const originalClearAmount = formatOriginalMoney(origClear);

  const [lastBuyDate, setLastBuyDate] = useState(() => {
    return stock["วันที่ซื้อล่าสุด"] ? parseDate(stock["วันที่ซื้อล่าสุด"]) : null;
  });
  const [lastSellDate, setLastSellDate] = useState(() => {
    return stock["วันที่ขายล่าสุด"] ? parseDate(stock["วันที่ขายล่าสุด"]) : null;
  });
  const [lastDividendDate, setLastDividendDate] = useState(() => {
    return stock["วันที่ปันผลล่าสุด"] ? parseDate(stock["วันที่ปันผลล่าสุด"]) : null;
  });
  const [buyAmount, setBuyAmount] = useState(() => {
    return stock["ยอดซื้อ ($)"] !== undefined && stock["ยอดซื้อ ($)"] !== null ? stock["ยอดซื้อ ($)"] : '';
  });
  const [sellAmount, setSellAmount] = useState(() => {
    return stock["ยอดขาย ($)"] !== undefined && stock["ยอดขาย ($)"] !== null ? stock["ยอดขาย ($)"] : '';
  });
  const [dividendAmount, setDividendAmount] = useState(() => {
    return stock["ยอดปันผล ($)"] !== undefined && stock["ยอดปันผล ($)"] !== null ? stock["ยอดปันผล ($)"] : '';
  });
  const [taxAmount, setTaxAmount] = useState(() => {
    return stock["ภาษีปันผล ($)"] || stock["ภาษี ($)"] || stock["ยอดภาษี ($)"] || '';
  });
  const [clearAmount, setClearAmount] = useState(() => {
    return stock["ยอดกำจัด ($)"] !== undefined && stock["ยอดกำจัด ($)"] !== null 
      ? stock["ยอดกำจัด ($)"] 
      : (stock["clear_amount"] !== undefined && stock["clear_amount"] !== null ? stock["clear_amount"] : '');
  });
  const [stockStatus, setStockStatus] = useState(() => stock["สถานะ"] || '');
  const [shariahCompliant, setShariahCompliant] = useState(() => stock["หลักชะรีอะฮ์"] || '');
  const [dividendRate, setDividendRate] = useState(() => {
    return stock["อัตราปันผล (%)"] !== undefined && stock["อัตราปันผล (%)"] !== null ? stock["อัตราปันผล (%)"] : '';
  });
  const [clearRate, setClearRate] = useState(() => {
    return stock["อัตรากำจัด (%)"] !== undefined && stock["อัตรากำจัด (%)"] !== null 
      ? stock["อัตรากำจัด (%)"] 
      : (stock["clear_rate"] !== undefined && stock["clear_rate"] !== null ? stock["clear_rate"] : '');
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState('idle'); // 'idle' | 'success' | 'error'
  const [statusMessage, setStatusMessage] = useState('');

  const originalBuyAmountRaw = useMemo(() => stock["ยอดซื้อ ($)"] !== undefined && stock["ยอดซื้อ ($)"] !== null ? String(stock["ยอดซื้อ ($)"]) : '', [stock]);
  const originalSellAmountRaw = useMemo(() => stock["ยอดขาย ($)"] !== undefined && stock["ยอดขาย ($)"] !== null ? String(stock["ยอดขาย ($)"]) : '', [stock]);
  const originalDividendAmountRaw = useMemo(() => stock["ยอดปันผล ($)"] !== undefined && stock["ยอดปันผล ($)"] !== null ? String(stock["ยอดปันผล ($)"]) : '', [stock]);

  const rawTotalProfit = stockStatus === "ขายแล้ว" || stockStatus === "รอซื้อ"
    ? parseNumber(sellAmount) - parseNumber(buyAmount)
    : 0;
  const currentTotalProfit = Math.round(rawTotalProfit * 100) / 100;

  const currentGrossProfit = Math.round((currentTotalProfit + parseNumber(dividendAmount)) * 100) / 100;

  const currentNetIncome = Math.round((currentTotalProfit + (parseNumber(dividendAmount) - parseNumber(taxAmount)) - parseNumber(clearAmount)) * 100) / 100;

  const currentClearRateVal = parseFloat(clearRate) || 0;
  const rawTargetClearAmount = (parseNumber(dividendAmount) - parseNumber(taxAmount)) * (currentClearRateVal / 100) - parseNumber(clearAmount);
  const currentTargetClearAmount = Math.round(rawTargetClearAmount * 100) / 100;

  const [activeCalcField, setActiveCalcField] = useState(null); // 'buyAmount' | 'sellAmount' | 'dividendAmount' | 'taxAmount' | null
  const [calcExpression, setCalcExpression] = useState('');
  const [calcResult, setCalcResult] = useState('');

  const openCalculator = (fieldName, currentValue) => {
    setActiveCalcField(fieldName);
    setCalcExpression(currentValue ? currentValue.toString() : '');
    setCalcResult(currentValue ? currentValue.toString() : '');
  };

  const handleCalcKeyPress = (key) => {
    if (key === 'C') {
      setCalcExpression('');
      setCalcResult('');
    } else if (key === '⌫') {
      setCalcExpression(prev => {
        const clean = prev.trim();
        if (clean.endsWith('+') || clean.endsWith('-') || clean.endsWith('×') || clean.endsWith('÷')) {
          // Remove operator and surrounding spaces
          return prev.slice(0, -3);
        }
        return prev.slice(0, -1);
      });
    } else if (key === '=') {
      evaluateExpression();
    } else if (['+', '-', '×', '÷'].includes(key)) {
      setCalcExpression(prev => {
        if (!prev) return '';
        const clean = prev.trim();
        if (clean.endsWith('+') || clean.endsWith('-') || clean.endsWith('×') || clean.endsWith('÷')) {
          // Replace operator
          return prev.slice(0, -3) + ` ${key} `;
        }
        return prev + ` ${key} `;
      });
    } else {
      setCalcExpression(prev => prev + key);
    }
  };

  const evaluateExpression = () => {
    if (!calcExpression) return;
    let formula = calcExpression.replace(/×/g, '*').replace(/÷/g, '/');
    const sanitized = formula.replace(/[^0-9+\-*/().\s]/g, '');
    try {
      if (!sanitized.trim()) return;
      const evalFn = new Function(`return (${sanitized})`);
      const res = evalFn();
      if (res === null || res === undefined || isNaN(res)) {
        setCalcResult('Error');
        return;
      }
      const formatted = Number.isInteger(res) ? res.toString() : parseFloat(res.toFixed(4)).toString();
      setCalcResult(formatted);
      setCalcExpression(formatted);
    } catch (e) {
      setCalcResult('Error');
    }
  };

  useEffect(() => {
    if (!calcExpression) {
      setCalcResult('');
      return;
    }
    
    let cleanExpr = calcExpression.trim();
    if (cleanExpr.endsWith('+') || cleanExpr.endsWith('-') || cleanExpr.endsWith('×') || cleanExpr.endsWith('÷')) {
      cleanExpr = cleanExpr.slice(0, -1).trim();
    }
    
    if (!cleanExpr) {
      setCalcResult('');
      return;
    }

    let formula = cleanExpr.replace(/×/g, '*').replace(/÷/g, '/');
    const sanitized = formula.replace(/[^0-9+\-*/().\s]/g, '');
    try {
      const evalFn = new Function(`return (${sanitized})`);
      const res = evalFn();
      if (res !== null && res !== undefined && !isNaN(res)) {
        const formatted = Number.isInteger(res) ? res.toString() : parseFloat(res.toFixed(4)).toString();
        setCalcResult(formatted);
      }
    } catch (e) {
      // Silent error during live preview
    }
  }, [calcExpression]);

  const handleApplyCalc = () => {
    let finalValue = calcResult || calcExpression;
    if (finalValue === 'Error') return;
    
    const num = parseFloat(finalValue);
    const resultStr = isNaN(num) ? '' : num.toString();

    if (activeCalcField === 'buyAmount') {
      setBuyAmount(resultStr);
      if (resultStr !== '' && resultStr !== originalBuyAmountRaw) {
        setLastBuyDate(new Date());
      }
    }
    else if (activeCalcField === 'sellAmount') {
      setSellAmount(resultStr);
      if (resultStr !== '' && resultStr !== originalSellAmountRaw) {
        setLastSellDate(new Date());
      }
    }
    else if (activeCalcField === 'dividendAmount') {
      setDividendAmount(resultStr);
      if (resultStr !== '' && resultStr !== originalDividendAmountRaw) {
        setLastDividendDate(new Date());
      }
    }
    else if (activeCalcField === 'taxAmount') setTaxAmount(resultStr);
    else if (activeCalcField === 'clearAmount') setClearAmount(resultStr);
    else if (activeCalcField === 'dividendRate') setDividendRate(resultStr);
    else if (activeCalcField === 'clearRate') setClearRate(resultStr);

    setActiveCalcField(null);
  };

  const popoverRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target) && !event.target.closest('.input-action-btn')) {
        setActiveCalcField(null);
      }
    };
    if (activeCalcField) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [activeCalcField]);

  const renderCalculatorPopover = (fieldName) => {
    return (
      <div 
        ref={popoverRef}
        className={`calculator-popover popover-right ${['dividendRate', 'clearRate'].includes(fieldName) ? 'popover-down' : 'popover-up'}`}
      >
        <div className="calc-header">
          <div className="calc-title">
            <i className="fa-solid fa-calculator" style={{ fontSize: '14px', color: 'var(--primary)' }}></i>
            <span>เครื่องคิดเลข</span>
          </div>
          <button 
            type="button" 
            className="modal-close-btn" 
            style={{ padding: '2px' }}
            onClick={(e) => {
              e.stopPropagation();
              setActiveCalcField(null);
            }}
          >
            <i className="fa-solid fa-xmark" style={{ fontSize: '14px' }}></i>
          </button>
        </div>
        
        <div className="calc-display">
          <div className="calc-display-expression">
            {calcExpression || '0'}
          </div>
          <div className="calc-display-result">
            {calcResult || calcExpression || '0'}
          </div>
        </div>
        
        <div className="calc-grid" style={{ minHeight: '160px' }}>
          <button type="button" className="calc-btn clear" onClick={() => handleCalcKeyPress('C')}>C</button>
          <button type="button" className="calc-btn operator" onClick={() => handleCalcKeyPress('(')}>(</button>
          <button type="button" className="calc-btn operator" onClick={() => handleCalcKeyPress(')')}>)</button>
          <button type="button" className="calc-btn operator" onClick={() => handleCalcKeyPress('÷')}>÷</button>
          
          <button type="button" className="calc-btn" onClick={() => handleCalcKeyPress('7')}>7</button>
          <button type="button" className="calc-btn" onClick={() => handleCalcKeyPress('8')}>8</button>
          <button type="button" className="calc-btn" onClick={() => handleCalcKeyPress('9')}>9</button>
          <button type="button" className="calc-btn operator" onClick={() => handleCalcKeyPress('×')}>×</button>
          
          <button type="button" className="calc-btn" onClick={() => handleCalcKeyPress('4')}>4</button>
          <button type="button" className="calc-btn" onClick={() => handleCalcKeyPress('5')}>5</button>
          <button type="button" className="calc-btn" onClick={() => handleCalcKeyPress('6')}>6</button>
          <button type="button" className="calc-btn operator" onClick={() => handleCalcKeyPress('-')}>-</button>
          
          <button type="button" className="calc-btn" onClick={() => handleCalcKeyPress('1')}>1</button>
          <button type="button" className="calc-btn" onClick={() => handleCalcKeyPress('2')}>2</button>
          <button type="button" className="calc-btn" onClick={() => handleCalcKeyPress('3')}>3</button>
          <button type="button" className="calc-btn operator" onClick={() => handleCalcKeyPress('+')}>+</button>
          
          <button type="button" className="calc-btn" onClick={() => handleCalcKeyPress('0')}>0</button>
          <button type="button" className="calc-btn" onClick={() => handleCalcKeyPress('.')}>.</button>
          <button type="button" className="calc-btn clear" onClick={() => handleCalcKeyPress('⌫')}>⌫</button>
          <button type="button" className="calc-btn equals" onClick={() => handleCalcKeyPress('=')}>=</button>
        </div>
        
        <div className="calc-footer">
          <button 
            type="button" 
            className="form-btn cancel" 
            onClick={(e) => {
              e.stopPropagation();
              setActiveCalcField(null);
            }} 
            style={{ flex: 1, padding: '0.35rem' }}
          >
            ยกเลิก
          </button>
          <button 
            type="button" 
            className="form-btn submit" 
            onClick={(e) => {
              e.stopPropagation();
              handleApplyCalc();
            }} 
            style={{ flex: 1, padding: '0.35rem' }}
          >
            ตกลง
          </button>
        </div>
      </div>
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatus('idle');

    const getOrNull = (val) => {
      const parsed = parseFloat(val);
      return isNaN(parsed) || parsed === 0 ? null : parsed;
    };
    
    const requestData = {
      sheet_name: stock.port || 'Extra',
      symbol: stock["ชื่อหุ้น"],
      status: stockStatus || null,
      last_buy_date: lastBuyDate ? `${lastBuyDate.getFullYear()}-${String(lastBuyDate.getMonth() + 1).padStart(2, '0')}-${String(lastBuyDate.getDate()).padStart(2, '0')}` : null,
      last_sell_date: lastSellDate ? `${lastSellDate.getFullYear()}-${String(lastSellDate.getMonth() + 1).padStart(2, '0')}-${String(lastSellDate.getDate()).padStart(2, '0')}` : null,
      last_dividend_date: lastDividendDate ? `${lastDividendDate.getFullYear()}-${String(lastDividendDate.getMonth() + 1).padStart(2, '0')}-${String(lastDividendDate.getDate()).padStart(2, '0')}` : null,
      buy_amount: getOrNull(buyAmount),
      sell_amount: getOrNull(sellAmount),
      dividend_amount: getOrNull(dividendAmount),
      tax_amount: getOrNull(taxAmount),
      clear_amount: getOrNull(clearAmount),
      dividend_rate: getOrNull(dividendRate),
      clear_rate: getOrNull(clearRate),
      shariah_compliant: shariahCompliant || null
    };

    try {
      const response = await fetch(UPDATE_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/plain',
        },
        body: JSON.stringify(requestData)
      });
      
      const json = await response.json();
      
      if (json.status === 'success') {
        setStatus('success');
        setStatusMessage(json.message || 'อัปเดตข้อมูลสำเร็จ');
        setTimeout(() => {
          onUpdateSuccess();
          onClose();
        }, 2000);
      } else {
        setStatus('error');
        setStatusMessage(json.message || 'เกิดข้อผิดพลาดในการอัปเดตข้อมูล');
      }
    } catch (err) {
      console.error(err);
      setStatus('error');
      setStatusMessage('เชื่อมต่อเซิร์ฟเวอร์ล้มเหลว กรุณาลองใหม่อีกครั้ง');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-backdrop">
      <motion.div 
        className="modal-content glass-card"
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        transition={{ duration: 0.2 }}
      >
        {status === 'success' ? (
          <div className="modal-status-screen success">
            <i className="fa-solid fa-circle-check status-icon success-icon animate-bounce" style={{ fontSize: '56px' }}></i>
            <h3>อัปเดตข้อมูลสำเร็จ!</h3>
            <p className="text-muted">{statusMessage}</p>
            <div className="loading-dots">
              <span>กำลังโหลดข้อมูลใหม่</span>
              <span className="dot">.</span>
              <span className="dot">.</span>
              <span className="dot">.</span>
            </div>
          </div>
        ) : status === 'error' ? (
          <div className="modal-status-screen error">
            <i className="fa-solid fa-circle-exclamation status-icon error-icon" style={{ fontSize: '56px' }}></i>
            <h3>เกิดข้อผิดพลาด</h3>
            <p className="status-error-text">{statusMessage}</p>
            <div style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem', width: '100%' }}>
              <button type="button" className="form-btn secondary" onClick={() => setStatus('idle')} style={{ flex: 1 }}>
                ลองอีกครั้ง
              </button>
              <button type="button" className="form-btn close" onClick={onClose} style={{ flex: 1 }}>
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="modal-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
                <a 
                  href={tradingViewUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  title="ดูภาพรวมใน TradingView"
                  className="logo-link"
                >
                  <div className="modal-stock-icon">
                    <img 
                      src={`https://assets.parqet.com/logos/symbol/${stock["ชื่อหุ้น"]}?format=png`} 
                      alt={stock["ชื่อหุ้น"]} 
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.nextSibling.style.display = 'block';
                      }}
                      style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '2px' }}
                    />
                    <span style={{ display: 'none', fontSize: '0.8rem', fontWeight: 'bold', color: 'var(--primary)', padding: '8px' }}>
                      {stock["ชื่อหุ้น"].substring(0, 2)}
                    </span>
                  </div>
                </a>
                <div>
                  <h3 className="modal-title" style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', margin: 0 }}>
                    <a 
                      href={stock["TradingView"]} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      title="ดูใน TradingView"
                      style={{ textDecoration: 'none', color: 'inherit', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      className="ticker-link hover-opacity"
                    >
                      <span style={{ fontWeight: 700 }}>{stock["ชื่อหุ้น"]}</span>
                    </a>
                    {stock["เว็บไซต์"] ? (
                      <a 
                        href={stock["เว็บไซต์"]} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        title={`ไปที่เว็บไซต์ของ ${stock["ชื่อบริษัท"]}`}
                        style={{ textDecoration: 'none', color: 'inherit', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                        className="hover-opacity text-muted"
                      >
                        <span style={{ fontWeight: 400, fontSize: '0.85rem' }}>{stock["ชื่อบริษัท"]}</span>
                      </a>
                    ) : (
                      <span className="text-muted" style={{ fontWeight: 400, fontSize: '0.85rem' }}>{stock["ชื่อบริษัท"]}</span>
                    )}
                    {stock.port && (
                      <span className="highlight-tag" style={{ fontSize: '0.7rem', padding: '0.2rem 0.6rem', borderRadius: '20px', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                        {stock.port}
                      </span>
                    )}
                    {stock["ลำดับการซื้อ"] && <span className="order-tag">ลำดับที่ {stock["ลำดับการซื้อ"]}</span>}
                  </h3>
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span className={`market-tag ${
                      stock["ตลาด"] === 'NYSE' ? 'market-tag-nyse' :
                      stock["ตลาด"] === 'NASDAQ' ? 'market-tag-nasdaq' : ''
                    }`}>{stock["ตลาด"]}</span>
                    {(() => {
                      const typeVal = stock["หมวดธุรกิจ"];
                      if (!typeVal) return null;
                      
                      const sectorMap = {
                        'เทคโนโลยีอิเลคทรอนิกส์': 'electronic-technology',
                        'บริการทางด้านเทคโนโลยี': 'technology-services',
                        'เทคโนโลยีเกี่ยวกับสุขภาพ': 'health-technology',
                        'การค้าปลีก': 'retail-trade',
                        'การผลิตของผู้ผลิต': 'producer-manufacturing',
                        'บริการการกระจายสินค้า': 'distribution-services',
                        'สินค้าอุปโภคที่ไม่คงทนถาวร': 'consumer-non-durables',
                        'สินค้าอุปโภคคงทนถาวร': 'consumer-durables',
                        'อุตสาหกรรมเชิงกระบวนการ': 'process-industries',
                        'บริการเกี่ยวกับอุตสาหกรรม': 'commercial-services',
                        'บริการพาณิชยกรรม': 'commercial-services',
                        'แร่พลังงาน': 'energy-minerals',
                        'การเงิน': 'finance',
                        'สาธารณูปโภค': 'utilities',
                        'การขนส่ง': 'transportation',
                        'บริการสำหรับผู้บริโภค': 'consumer-services',
                        'บริการเกี่ยวกับสุขภาพ': 'health-services',
                        'แร่ที่ไม่ใช่พลังงาน': 'non-energy-minerals',
                        'การสื่อสาร': 'communications'
                      };
                      
                      const slug = sectorMap[typeVal.trim()];
                      if (slug) {
                        const url = `https://th.tradingview.com/markets/stocks-usa/sectorandindustry-sector/${slug}/`;
                        return (
                          <a 
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={`ดูหมวดหมู่ ${typeVal} ใน TradingView`}
                            style={{ textDecoration: 'none', color: 'inherit' }}
                            className="hover-opacity"
                          >
                            <span className="text-muted" style={{ fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              {typeVal}
                            </span>
                          </a>
                        );
                      }
                      
                      return <span className="text-muted" style={{ fontSize: '0.85rem' }}>{typeVal}</span>;
                    })()}
                    {stock["อุตสาหกรรม"] && <span className="text-muted" style={{ opacity: 0.4, fontSize: '0.85rem' }}>/</span>}
                    {(() => {
                      const indVal = stock["อุตสาหกรรม"];
                      if (!indVal) return null;
                      
                      const industryMap = {
                        'เซมิคอนดักเตอร์': 'semiconductors',
                        'ยารายใหญ่': 'pharmaceuticals-major',
                        'ชุดซอฟต์แวร์สำเร็จรูป': 'packaged-software',
                        'อุปกรณ์โทรคมนาคม': 'telecommunications-equipment',
                        'เครื่องจักรอุตสาหกรรม': 'industrial-machinery',
                        'การดูแลครัวเรือน/บุคคล': 'household-personal-care',
                        'เครือข่ายการพัฒนาปรับปรุงบ้าน': 'home-improvement-chains',
                        'เคมีพิเศษเฉพาะ': 'chemicals-specialty',
                        'อุปกรณ์ต่อพ่วงคอมพิวเตอร์': 'computer-peripherals',
                        'เชี่ยวชาญพิเศษด้านการแพทย์': 'medical-specialties',
                        'ชิ้นส่วนอิเลคทรอนิกส์': 'electronic-components',
                        'ค้าปลีกเกี่ยวกับเสื้อผ้า/รองเท้า': 'apparel-footwear-retail',
                        'เครื่องใช้ไฟฟ้า': 'electrical-products',
                        'วิศวกรรมและก่อสร้าง': 'engineering-construction',
                        'ผู้จัดจำหน่ายทางการแพทย์': 'medical-distributors',
                        'บริการด้านสิ่งแวดล้อม': 'environmental-services',
                        'เชี่ยวชาญพิเศษด้านอุตสาหกรรม': 'industrial-specialties',
                        'ผู้จัดจำหน่ายค้าส่ง': 'wholesale-distributors',
                        'ร้านค้าพิเศษเฉพาะ': 'specialty-stores',
                        'บริการด้านเทคโนโลยีสารสนเทศ': 'information-technology-services',
                        'บริการน้ำมันแบบครบวงจร': 'integrated-oil',
                        'การผลิตน้ำมันและก๊าซ': 'oil-gas-production',
                        'สินค้าโภคภัณฑ์/เครื่องจักรทางการเกษตร': 'agricultural-commodities-milling',
                        'การกลั่นน้ำมันและการตลาดเกี่ยวกับน้ำมัน': 'oil-refining-marketing',
                        'ไบโอเทคโนโลยี': 'biotechnology'
                      };
                      
                      const slug = industryMap[indVal.trim()];
                      if (slug) {
                        const url = `https://th.tradingview.com/markets/stocks-usa/sectorandindustry-industry/${slug}/`;
                        return (
                          <a 
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={`ดูอุตสาหกรรม ${indVal} ใน TradingView`}
                            style={{ textDecoration: 'none', color: 'inherit' }}
                            className="hover-opacity"
                          >
                            <span className="text-muted" style={{ fontSize: '0.85rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              {indVal}
                            </span>
                          </a>
                        );
                      }
                      
                      return <span className="text-muted" style={{ fontSize: '0.85rem' }}>{indVal}</span>;
                    })()}
                  </div>
                </div>
              </div>
              
              <div style={{ marginLeft: 'auto', marginRight: '0.875rem', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.125rem' }}>
                {stock["มูลค่าตลาด ($)"] && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    <span style={{ fontSize: '0.675rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.025em' }}>มูลค่าตลาด</span>
                    <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>
                      {formatCurrency(parseNumber(stock["มูลค่าตลาด ($)"]))}
                    </span>

                  </div>
                )}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                  <span style={{ fontSize: '0.725rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.025em' }}>ราคาหุ้น</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
                    <span style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-main)' }}>
                      ${(parseFloat(stock["ราคาหุ้น ($)"]) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    {(() => {
                      const changeVal = stock["เปลี่ยนแปลง (%)"] || stock["changePercent"] || stock["เปลี่ยนแปลงราคา (%)"] || stock["เปอร์เซ็นต์การเปลี่ยนแปลง"] || stock["% เปลี่ยนแปลง"];
                      if (!changeVal) return null;
                      const parsedChange = parseFloat(String(changeVal).replace('%', ''));
                      if (isNaN(parsedChange)) return null;
                      
                      const isPositive = parsedChange > 0;
                      const isNegative = parsedChange < 0;
                      const icon = isPositive ? 'fa-caret-up' : isNegative ? 'fa-caret-down' : '';
                      return (
                        <span 
                          className={`price-change-badge ${isPositive ? 'positive' : isNegative ? 'negative' : 'neutral'}`}
                          title="เปอร์เซ็นต์การเปลี่ยนแปลงราคาหุ้น"
                        >
                          {icon && <i className={`fa-solid ${icon}`} style={{ fontSize: '0.7rem' }}></i>}
                          {isPositive ? '+' : ''}{parsedChange.toFixed(2)}%
                        </span>
                      );
                    })()}
                  </div>
                </div>
              </div>

              <button type="button" className="modal-close-btn" onClick={onClose}>
                <i className="fa-solid fa-xmark" style={{ fontSize: '18px' }}></i>
              </button>
            </div>

            <div className="modal-body">
              <div className="target-summary-ref" style={{ flexWrap: 'wrap', gap: '0.75rem 0.5rem' }}>
                <div className="target-ref-card" style={{ minWidth: '100px', flex: '1 1 0' }}>
                  <span className="target-ref-label" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                    <span>ราคาตั้งซื้อ</span>
                    <i className="fa-solid fa-bullseye" style={{ color: targetPrice < 0 ? '#ef4444' : '#3b82f6', fontSize: '0.75rem' }}></i>
                  </span>
                  <span className={`target-ref-value ${targetPrice < 0 ? 'text-red' : targetPrice === 0 ? 'text-grey' : ''}`} style={{ fontSize: '1rem' }}>${targetPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="target-summary-divider" style={{ margin: '0 0.5rem' }}></div>
                <div className="target-ref-card" style={{ minWidth: '100px', flex: '1 1 0' }}>
                  <span className="target-ref-label" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                    <span>ยอดตั้งซื้อ</span>
                    <i className="fa-solid fa-bars-progress" style={{ color: remainingTarget < 0 ? '#ef4444' : '#f59e0b', fontSize: '0.75rem' }}></i>
                  </span>
                  <span className={`target-ref-value ${remainingTarget < 0 ? 'text-red' : remainingTarget === 0 ? 'text-grey' : ''}`} style={{ fontSize: '1rem' }}>
                    ${remainingTarget.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="target-summary-divider" style={{ margin: '0 0.5rem' }}></div>
                <div className="target-ref-card" style={{ minWidth: '100px', flex: '1 1 0' }}>
                  <span className="target-ref-label" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                    <span>ยอดตั้งกำจัด</span>
                    <i className="fa-solid fa-filter" style={{ color: currentTargetClearAmount < 0 ? '#ef4444' : '#06b6d4', fontSize: '0.75rem' }}></i>
                  </span>
                  <span className={`target-ref-value ${currentTargetClearAmount < 0 ? 'text-red' : currentTargetClearAmount === 0 ? 'text-grey' : ''}`} style={{ fontSize: '1rem' }}>
                    ${currentTargetClearAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="target-summary-divider" style={{ margin: '0 0.5rem' }}></div>
                <div className="target-ref-card" style={{ minWidth: '100px', flex: '1 1 0' }}>
                  <span className="target-ref-label" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                    <span>กำไรขาย</span>
                    <i className="fa-solid fa-arrow-trend-up" style={{ color: currentTotalProfit < 0 ? '#ef4444' : '#14b8a6', fontSize: '0.75rem' }}></i>
                  </span>
                  <span className={`target-ref-value ${currentTotalProfit > 0 ? 'text-green' : currentTotalProfit < 0 ? 'text-red' : 'text-grey'}`} style={{ fontSize: '1rem' }}>
                    ${currentTotalProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="target-summary-divider" style={{ margin: '0 0.5rem' }}></div>
                <div className="target-ref-card" style={{ minWidth: '100px', flex: '1 1 0' }}>
                  <span className="target-ref-label" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                    <span>กำไรรวม</span>
                    <i className="fa-solid fa-chart-line" style={{ color: currentGrossProfit < 0 ? '#ef4444' : '#059669', fontSize: '0.75rem' }}></i>
                  </span>
                  <span className={`target-ref-value ${currentGrossProfit > 0 ? 'text-green' : currentGrossProfit < 0 ? 'text-red' : 'text-grey'}`} style={{ fontSize: '1rem' }}>
                    ${currentGrossProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="target-summary-divider" style={{ margin: '0 0.5rem' }}></div>
                <div className="target-ref-card" style={{ minWidth: '100px', flex: '1 1 0' }}>
                  <span className="target-ref-label" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                    <span>กำไรสุทธิ</span>
                    <i className="fa-solid fa-wallet" style={{ color: currentNetIncome < 0 ? '#ef4444' : '#ec4899', fontSize: '0.75rem' }}></i>
                  </span>
                  <span className={`target-ref-value ${currentNetIncome > 0 ? 'text-green' : currentNetIncome < 0 ? 'text-red' : 'text-grey'}`} style={{ fontSize: '1rem' }}>
                    ${currentNetIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="form-grid-container">
                <div className="form-group">
                  <label className="form-label">หลักชะรีอะฮ์</label>
                  <Select
                    options={shariahOptions}
                    value={shariahOptions.find(opt => opt.value === shariahCompliant) || null}
                    onChange={(selected) => setShariahCompliant(selected ? selected.value : '')}
                    placeholder="-- เลือก --"
                    classNamePrefix="react-select"
                    styles={statusSelectStyles}
                    isSearchable={false}
                    menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                  />
                  <span className="input-helper-text">ค่าเดิม: {stock["หลักชะรีอะฮ์"] || 'ไม่มี'}</span>
                </div>

                <div className="form-group">
                  <label className="form-label">สถานะ</label>
                  <Select
                    options={statusOptions}
                    value={statusOptions.find(opt => opt.value === stockStatus) || null}
                    onChange={(selected) => setStockStatus(selected ? selected.value : '')}
                    placeholder="-- เลือกสถานะ --"
                    classNamePrefix="react-select"
                    styles={statusSelectStyles}
                    isSearchable={false}
                    menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
                  />
                  <span className="input-helper-text">ค่าเดิม: {stock["สถานะ"] || 'ไม่มี'}</span>
                </div>

                <div className="form-group">
                  <label className="form-label">อัตราปันผล (%)</label>
                  <div className="input-with-button">
                    <input 
                      type="number" 
                      step="0.01" 
                      min="0"
                      placeholder="0.00"
                      className="form-input" 
                      value={dividendRate} 
                      onChange={(e) => setDividendRate(e.target.value)}
                    />
                    <button 
                      type="button" 
                      className="input-action-btn" 
                      onClick={() => openCalculator('dividendRate', dividendRate)}
                      title="เปิดเครื่องคิดเลข"
                    >
                      <i className="fa-solid fa-calculator" style={{ fontSize: '14px' }}></i>
                    </button>
                    {activeCalcField === 'dividendRate' && renderCalculatorPopover('dividendRate')}
                  </div>
                  <span className="input-helper-text">ค่าเดิม: {stock["อัตราปันผล (%)"] || '0.00'}%</span>
                </div>

                <div className="form-group">
                  <label className="form-label">อัตรากำจัด (%)</label>
                  <div className="input-with-button">
                    <input 
                      type="number" 
                      step="0.01" 
                      min="0"
                      placeholder="0.00"
                      className="form-input" 
                      value={clearRate} 
                      onChange={(e) => setClearRate(e.target.value)}
                    />
                    <button 
                      type="button" 
                      className="input-action-btn" 
                      onClick={() => openCalculator('clearRate', clearRate)}
                      title="เปิดเครื่องคิดเลข"
                    >
                      <i className="fa-solid fa-calculator" style={{ fontSize: '14px' }}></i>
                    </button>
                    {activeCalcField === 'clearRate' && renderCalculatorPopover('clearRate')}
                  </div>
                  <span className="input-helper-text">ค่าเดิม: {stock["อัตรากำจัด (%)"] || stock["clear_rate"] || '0.00'}%</span>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    วันที่ซื้อล่าสุด
                  </label>
                  <DatePicker
                    selected={lastBuyDate}
                    onChange={(date) => setLastBuyDate(date)}
                    className="form-input"
                    dateFormat="dd/MM/yyyy"
                    placeholderText="วว/ดด/ปปปป"
                    isClearable
                    todayButton="วันนี้"
                    popperPlacement="top"
                    showMonthDropdown
                    showYearDropdown
                    dropdownMode="select"
                  />
                  <span className="input-helper-text">ค่าเดิม: {originalBuyDate}</span>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    วันที่ขายล่าสุด
                  </label>
                  <DatePicker
                    selected={lastSellDate}
                    onChange={(date) => setLastSellDate(date)}
                    className="form-input"
                    dateFormat="dd/MM/yyyy"
                    placeholderText="วว/ดด/ปปปป"
                    isClearable
                    todayButton="วันนี้"
                    popperPlacement="top"
                    showMonthDropdown
                    showYearDropdown
                    dropdownMode="select"
                  />
                  <span className="input-helper-text">ค่าเดิม: {originalSellDate}</span>
                </div>

                <div className="form-group">
                  <label className="form-label">
                    วันที่ปันผลล่าสุด
                  </label>
                  <DatePicker
                    selected={lastDividendDate}
                    onChange={(date) => setLastDividendDate(date)}
                    className="form-input"
                    dateFormat="dd/MM/yyyy"
                    placeholderText="วว/ดด/ปปปป"
                    isClearable
                    todayButton="วันนี้"
                    popperPlacement="top"
                    showMonthDropdown
                    showYearDropdown
                    dropdownMode="select"
                  />
                  <span className="input-helper-text">ค่าเดิม: {originalDividendDate}</span>
                </div>

                <div className="form-group">
                  <label className="form-label">ยอดซื้อ ($)</label>
                  <div className="input-with-button">
                    <input 
                      type="number" 
                      step="0.01" 
                      min="0"
                      placeholder="0.00"
                      className="form-input" 
                      value={buyAmount} 
                      onChange={(e) => {
                        setBuyAmount(e.target.value);
                        if (e.target.value !== '' && e.target.value !== originalBuyAmountRaw) {
                          setLastBuyDate(new Date());
                        }
                      }}
                    />
                    <button 
                      type="button" 
                      className="input-action-btn" 
                      onClick={() => openCalculator('buyAmount', buyAmount)}
                      title="เปิดเครื่องคิดเลข"
                    >
                      <i className="fa-solid fa-calculator" style={{ fontSize: '14px' }}></i>
                    </button>
                    {activeCalcField === 'buyAmount' && renderCalculatorPopover('buyAmount')}
                  </div>
                  <span className="input-helper-text">ค่าเดิม: {originalBuyAmount}</span>
                </div>

                <div className="form-group">
                  <label className="form-label">ยอดขาย ($)</label>
                  <div className="input-with-button">
                    <input 
                      type="number" 
                      step="0.01" 
                      min="0"
                      placeholder="0.00"
                      className="form-input" 
                      value={sellAmount} 
                      onChange={(e) => {
                        setSellAmount(e.target.value);
                        if (e.target.value !== '' && e.target.value !== originalSellAmountRaw) {
                          setLastSellDate(new Date());
                        }
                      }}
                    />
                    <button 
                      type="button" 
                      className="input-action-btn" 
                      onClick={() => openCalculator('sellAmount', sellAmount)}
                      title="เปิดเครื่องคิดเลข"
                    >
                      <i className="fa-solid fa-calculator" style={{ fontSize: '14px' }}></i>
                    </button>
                    {activeCalcField === 'sellAmount' && renderCalculatorPopover('sellAmount')}
                  </div>
                  <span className="input-helper-text">ค่าเดิม: {originalSellAmount}</span>
                </div>

                <div className="form-group">
                  <label className="form-label">ยอดปันผล ($)</label>
                  <div className="input-with-button">
                    <input 
                      type="number" 
                      step="0.01" 
                      min="0"
                      placeholder="0.00"
                      className="form-input" 
                      value={dividendAmount} 
                      onChange={(e) => {
                        setDividendAmount(e.target.value);
                        if (e.target.value !== '' && e.target.value !== originalDividendAmountRaw) {
                          setLastDividendDate(new Date());
                        }
                      }}
                    />
                    <button 
                      type="button" 
                      className="input-action-btn" 
                      onClick={() => openCalculator('dividendAmount', dividendAmount)}
                      title="เปิดเครื่องคิดเลข"
                    >
                      <i className="fa-solid fa-calculator" style={{ fontSize: '14px' }}></i>
                    </button>
                    {activeCalcField === 'dividendAmount' && renderCalculatorPopover('dividendAmount')}
                  </div>
                  <span className="input-helper-text">ค่าเดิม: {originalDividendAmount}</span>
                </div>

                <div className="form-group">
                  <label className="form-label">ยอดภาษี ($)</label>
                  <div className="input-with-button">
                    <input 
                      type="number" 
                      step="0.01" 
                      min="0"
                      placeholder="0.00"
                      className="form-input" 
                      value={taxAmount} 
                      onChange={(e) => setTaxAmount(e.target.value)}
                    />
                    <button 
                      type="button" 
                      className="input-action-btn" 
                      onClick={() => openCalculator('taxAmount', taxAmount)}
                      title="เปิดเครื่องคิดเลข"
                    >
                      <i className="fa-solid fa-calculator" style={{ fontSize: '14px' }}></i>
                    </button>
                    {activeCalcField === 'taxAmount' && renderCalculatorPopover('taxAmount')}
                  </div>
                  <span className="input-helper-text">ค่าเดิม: {originalTaxAmount}</span>
                </div>

                <div className="form-group">
                  <label className="form-label">ยอดกำจัด ($)</label>
                  <div className="input-with-button">
                    <input 
                      type="number" 
                      step="0.01" 
                      min="0"
                      placeholder="0.00"
                      className="form-input" 
                      value={clearAmount} 
                      onChange={(e) => setClearAmount(e.target.value)}
                    />
                    <button 
                      type="button" 
                      className="input-action-btn" 
                      onClick={() => openCalculator('clearAmount', clearAmount)}
                      title="เปิดเครื่องคิดเลข"
                    >
                      <i className="fa-solid fa-calculator" style={{ fontSize: '14px' }}></i>
                    </button>
                    {activeCalcField === 'clearAmount' && renderCalculatorPopover('clearAmount')}
                  </div>
                  <span className="input-helper-text">ค่าเดิม: {originalClearAmount}</span>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <button type="button" className="form-btn cancel" onClick={onClose} disabled={isSubmitting}>
                ยกเลิก
              </button>
              <button type="submit" className="form-btn submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <span className="spinner-container">
                    <i className="fa-solid fa-arrows-rotate animate-spin" style={{ fontSize: '14px' }}></i>
                    กำลังบันทึก...
                  </span>
                ) : 'บันทึก'}
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}
