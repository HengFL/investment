import React, { useState, useEffect, useMemo, useRef } from 'react';
import { TrendingUp, PieChart, DollarSign, Activity, ExternalLink, RefreshCw, Edit, X, CheckCircle2, AlertCircle, Calendar } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const API_URL = 'https://script.google.com/macros/s/AKfycbwkjycorGKU-NDKVxETVhEC_BiKHhSuuUhMX4uZhDTIYi5KuoPjtIu5FzwE3Ahhc1HZ/exec';
const UPDATE_API_URL = 'https://script.google.com/macros/s/AKfycbzNnoWQyuqBNn2y1kNq3ecRc8bTx_DeU5GmCCgF7y5ER3TOFZmiTWXnr_unNg6unYzS/exec';

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
  } catch (e) {
    return dateStr;
  }
};

const getRelativeTime = (dateStr) => {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    
    if (diffInSeconds < 0) return ''; // Future dates
    if (diffInSeconds < 60) return 'เมื่อครู่';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} นาทีที่แล้ว`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} ชม.ที่แล้ว`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)} วันที่แล้ว`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 604800)} สัปดาห์ที่แล้ว`;
    if (diffInSeconds < 31536000) return `${Math.floor(diffInSeconds / 2592000)} เดือนที่แล้ว`;
    return `${Math.floor(diffInSeconds / 31536000)} ปีที่แล้ว`;
  } catch (e) {
    return '';
  }
};

const getTimeColor = (dateStr) => {
  if (!dateStr) return '';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    const diffInMonths = diffInSeconds / (30 * 24 * 3600);
    
    if (diffInMonths <= 1) return 'time-fresh';
    if (diffInMonths <= 2) return 'time-warning-1';
    if (diffInMonths <= 3) return 'time-warning-2';
    return 'time-danger';
  } catch (e) {
    return '';
  }
};

const getHoldingAge = (firstBuyDateStr, lastSellDateStr, status) => {
  if (!firstBuyDateStr) return '';
  try {
    const startDate = new Date(firstBuyDateStr);
    if (isNaN(startDate.getTime())) return '';
    
    let endDate = new Date();
    if (status === 'ขายแล้ว' && lastSellDateStr) {
      const sellDate = new Date(lastSellDateStr);
      if (!isNaN(sellDate.getTime())) {
        endDate = sellDate;
      }
    }
    
    let years = endDate.getFullYear() - startDate.getFullYear();
    let months = endDate.getMonth() - startDate.getMonth();
    let days = endDate.getDate() - startDate.getDate();
    
    if (days < 0) {
      months -= 1;
      const prevMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 0);
      days += prevMonth.getDate();
    }
    
    if (months < 0) {
      years -= 1;
      months += 12;
    }
    
    const parts = [];
    if (years > 0) {
      parts.push(`${years} ปี`);
    }
    if (months > 0) {
      parts.push(`${months} เดือน`);
    }
    if (days > 0 || parts.length === 0) {
      parts.push(`${days} วัน`);
    }
    
    return parts.join(' ');
  } catch (e) {
    return '';
  }
};

const calculateTargetAmount = (startDateStr, pricePerMonth) => {
  if (!startDateStr || !pricePerMonth) return 0;
  try {
    const start = new Date(startDateStr);
    const now = new Date();
    if (isNaN(start.getTime())) return 0;
    
    const years = now.getFullYear() - start.getFullYear();
    const months = (years * 12) + (now.getMonth() - start.getMonth());
    return Math.max(0, months) * pricePerMonth;
  } catch (e) {
    return 0;
  }
};

const formatCurrency = (val) => {
  const isNegative = val < 0;
  const absVal = Math.abs(val);
  let formatted = '';
  if (absVal >= 1e12) formatted = `${(absVal / 1e12).toFixed(2)}T`;
  else if (absVal >= 1e9) formatted = `${(absVal / 1e9).toFixed(2)}B`;
  else if (absVal >= 1e6) formatted = `${(absVal / 1e6).toFixed(2)}M`;
  else formatted = absVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  
  return isNegative ? `-$${formatted}` : `$${formatted}`;
};

const formatTHB = (val) => {
  const isNegative = val < 0;
  const absVal = Math.abs(val);
  let formatted = '';
  if (absVal >= 1e12) formatted = `${(absVal / 1e12).toFixed(2)}T`;
  else if (absVal >= 1e9) formatted = `${(absVal / 1e9).toFixed(2)}B`;
  else if (absVal >= 1e6) formatted = `${(absVal / 1e6).toFixed(2)}M`;
  else formatted = absVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  
  return isNegative ? `-฿${formatted}` : `฿${formatted}`;
};

function App() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedStock, setSelectedStock] = useState(null);
  const [exchangeRate, setExchangeRate] = useState(36.5);
  const PORT_CATEGORIES = {
    'Hold': ['Extra', 'Main', 'Second', 'Addon', 'Begin', 'DR'],
    'Trade': ['Trade'],
    'Sale': ['Sale']
  };

  const [activeMainTab, setActiveMainTab] = useState('Hold');
  const [activeSubTab, setActiveSubTab] = useState('Extra');

  const fetchData = async () => {
    setLoading(true);
    try {
      const [stockRes, rateRes] = await Promise.all([
        fetch(API_URL),
        fetch('https://open.er-api.com/v6/latest/USD').catch(err => {
          console.error('Exchange rate fetch error:', err);
          return null;
        })
      ]);
      
      const json = await stockRes.json();
      setData(json);
      
      if (rateRes && rateRes.ok) {
        const rateJson = await rateRes.json();
        if (rateJson && rateJson.rates && rateJson.rates.THB) {
          setExchangeRate(rateJson.rates.THB);
        }
      }
      setError(null);
    } catch (err) {
      console.error('Fetch error:', err);
      setError('ไม่สามารถโหลดข้อมูลได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const mainTabData = useMemo(() => {
    const subPorts = PORT_CATEGORIES[activeMainTab];
    return data.filter(item => subPorts.includes(item.port));
  }, [data, activeMainTab]);

  const filteredData = useMemo(() => {
    return data.filter(item => item.port === activeSubTab);
  }, [data, activeSubTab]);

  const subTabCounts = useMemo(() => {
    const counts = {};
    data.forEach(item => {
      if (item.port) {
        counts[item.port] = (counts[item.port] || 0) + 1;
      }
    });
    return counts;
  }, [data]);

  const summary = useMemo(() => {
    const totalStocks = mainTabData.length;
    const avgDividend = mainTabData.length > 0 
      ? mainTabData.reduce((acc, item) => acc + (parseFloat(item["อัตราปันผล (%)"]) || 0), 0) / mainTabData.length 
      : 0;
    
    // Sums for the new requested cards
    const totalTargetPrice = mainTabData.reduce((acc, item) => acc + (parseFloat(item["ราคาตั้งซื้อ ($)"]) || 0), 0);
    const totalBuyAmount = mainTabData.reduce((acc, item) => acc + (parseFloat(item["ยอดซื้อ ($)"]) || 0), 0);
    const totalSellAmount = mainTabData.reduce((acc, item) => acc + (parseFloat(item["ยอดขาย ($)"]) || 0), 0);
    
    // Total Remaining Target (Need to calculate per item then sum)
    const totalRemainingTarget = mainTabData.reduce((acc, item) => {
      const targetPrice = parseFloat(item["ราคาตั้งซื้อ ($)"]) || 0;
      if (item.port !== 'Trade' && targetPrice > 0) {
        const targetAmount = calculateTargetAmount(item["วันที่กำหนด"], item["ราคาตั้งซื้อ ($)"]);
        const remainingTarget = targetAmount - (parseFloat(item["ยอดซื้อ ($)"]) || 0) + (parseFloat(item["ยอดขาย ($)"]) || 0);
        return acc + remainingTarget;
      }
      return acc;
    }, 0);

    // Sum of Total Profit/Loss (only calculated for status 'ขายแล้ว')
    const totalProfitSum = mainTabData.reduce((acc, item) => {
      if (item["สถานะ"] === "ขายแล้ว") {
        const profit = (parseFloat(item["ยอดขาย ($)"]) || 0) - (parseFloat(item["ยอดซื้อ ($)"]) || 0);
        return acc + profit;
      }
      return acc;
    }, 0);

    // Sum of Total Dividend
    const totalDividendSum = mainTabData.reduce((acc, item) => acc + (parseFloat(item["ยอดปันผล ($)"]) || 0), 0);

    // Sum of Total Tax
    const totalTaxSum = mainTabData.reduce((acc, item) => {
      const taxVal = item["ภาษีปันผล ($)"] || item["ภาษี ($)"] || item["ยอดภาษี ($)"] || 0;
      return acc + (parseFloat(taxVal) || 0);
    }, 0);

    // Sum of Total Net Income
    const totalIncomeSum = totalProfitSum + (totalDividendSum - totalTaxSum);
    
    return {
      totalStocks,
      avgDividend,
      totalTargetPrice,
      totalBuyAmount,
      totalSellAmount,
      totalRemainingTarget,
      totalProfitSum,
      totalDividendSum,
      totalTaxSum,
      totalIncomeSum
    };
  }, [mainTabData]);

  const handleMainTabChange = (mainTab) => {
    setActiveMainTab(mainTab);
    setActiveSubTab(PORT_CATEGORIES[mainTab][0]);
  };

  if (error) {
    return (
      <div className="container" style={{ textAlign: 'center', paddingTop: '5rem' }}>
        <h2 style={{ color: 'var(--error)' }}>{error}</h2>
        <button className="tab-button active" onClick={fetchData} style={{ marginTop: '0.75rem' }}>
          ลองใหม่อีกครั้ง
        </button>
      </div>
    );
  }

  return (
    <div className="container">
      <header style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <motion.h1 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
          >
            Srock US
          </motion.h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap' }}>
            <p className="text-muted">หุ้นสหรัฐ</p>
            <span className="exchange-rate-badge" title="อัปเดตเรียลไทม์จาก open.er-api.com">
              1 USD ≈ ฿{exchangeRate.toFixed(2)}
            </span>
          </div>
        </div>
        <button 
          className="refresh-button" 
          onClick={fetchData} 
          disabled={loading}
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          <span>{loading ? 'กำลังรีเฟรช...' : 'รีเฟรชข้อมูล'}</span>
        </button>
      </header>

      {/* Main Tabs */}
      <div className="main-tabs-container">
        {Object.keys(PORT_CATEGORIES).map(mainTab => (
          <button
            key={mainTab}
            className={`main-tab-button ${activeMainTab === mainTab ? 'active' : ''}`}
            onClick={() => handleMainTabChange(mainTab)}
            style={{ position: 'relative' }}
          >
            {activeMainTab === mainTab && (
              <motion.div
                layoutId="activeMainTabBg"
                className="main-tab-active-bg"
                transition={{ type: 'spring', stiffness: 380, damping: 30 }}
              />
            )}
            <span style={{ position: 'relative', zIndex: 2 }}>{mainTab}</span>
          </button>
        ))}
      </div>

      {/* Mini Dashboard Summary */}
      <div className="summary-grid">
        <SummaryCard 
          label="จำนวนหุ้น" 
          value={summary.totalStocks} 
          icon={<PieChart size={20} color="var(--secondary)" />}
          delay={0.1}
        />
        <SummaryCard 
          label="ปันผลเฉลี่ย" 
          value={`${summary.avgDividend.toFixed(2)}%`} 
          icon={<TrendingUp size={20} color="var(--success)" />}
          delay={0.2}
          numValue={summary.avgDividend}
          colorMode="binary"
        />
        <SummaryCard 
          label="ราคาตั้งซื้อทั้งหมด" 
          value={formatCurrency(summary.totalTargetPrice)} 
          subValue={formatTHB(summary.totalTargetPrice * exchangeRate)}
          icon={<DollarSign size={20} color="var(--primary)" />}
          delay={0.3}
          numValue={summary.totalTargetPrice}
          colorMode="binary"
        />
        <SummaryCard 
          label="ยอดตั้งซื้อทั้งหมด" 
          value={formatCurrency(summary.totalRemainingTarget)} 
          subValue={formatTHB(summary.totalRemainingTarget * exchangeRate)}
          icon={<Activity size={20} color="var(--warning)" />}
          delay={0.4}
          numValue={summary.totalRemainingTarget}
        />
        <SummaryCard 
          label="ยอดซื้อทั้งหมด" 
          value={formatCurrency(summary.totalBuyAmount)} 
          subValue={formatTHB(summary.totalBuyAmount * exchangeRate)}
          icon={<DollarSign size={20} color="var(--success)" />}
          delay={0.5}
        />
        <SummaryCard 
          label="ยอดขายทั้งหมด" 
          value={formatCurrency(summary.totalSellAmount)} 
          subValue={formatTHB(summary.totalSellAmount * exchangeRate)}
          icon={<DollarSign size={20} color="var(--error)" />}
          delay={0.6}
        />
        <SummaryCard 
          label="ยอดกำไรทั้งหมด" 
          value={formatCurrency(summary.totalProfitSum)} 
          subValue={formatTHB(summary.totalProfitSum * exchangeRate)}
          icon={<TrendingUp size={20} color={summary.totalProfitSum >= 0 ? "var(--success)" : "var(--error)"} />}
          delay={0.7}
          numValue={summary.totalProfitSum}
        />
        <SummaryCard 
          label="ยอดปันผลทั้งหมด" 
          value={formatCurrency(summary.totalDividendSum)} 
          subValue={formatTHB(summary.totalDividendSum * exchangeRate)}
          icon={<DollarSign size={20} color="var(--success)" />}
          delay={0.8}
          numValue={summary.totalDividendSum}
          colorMode="binary"
        />
        <SummaryCard 
          label="ยอดภาษีทั้งหมด" 
          value={formatCurrency(summary.totalTaxSum)} 
          subValue={formatTHB(summary.totalTaxSum * exchangeRate)}
          icon={<DollarSign size={20} color="var(--error)" />}
          delay={0.9}
          numValue={summary.totalTaxSum}
          colorMode="binary"
        />
        <SummaryCard 
          label="รายได้ทั้งหมด" 
          value={formatCurrency(summary.totalIncomeSum)} 
          subValue={formatTHB(summary.totalIncomeSum * exchangeRate)}
          icon={<TrendingUp size={20} color={summary.totalIncomeSum >= 0 ? "var(--success)" : "var(--error)"} />}
          delay={1.0}
          numValue={summary.totalIncomeSum}
        />
      </div>

      {/* Sub Tabs */}
      <div className="tabs-container">
        {PORT_CATEGORIES[activeMainTab].map(subTab => {
          const count = subTabCounts[subTab] || 0;
          return (
            <button
              key={subTab}
              className={`tab-button ${activeSubTab === subTab ? 'active' : ''}`}
              onClick={() => setActiveSubTab(subTab)}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}
            >
              <span>{subTab}</span>
              <span className="tab-count-badge">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Stock List */}
      <div className="stock-list">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <p className="text-muted">กำลังโหลดข้อมูลพอร์ตของคุณ...</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {filteredData.length > 0 ? (
              filteredData.map((stock, index) => (
                <StockCard 
                  key={stock["ชื่อหุ้น"] + index} 
                  stock={stock} 
                  index={index} 
                  onUpdateClick={setSelectedStock} 
                  exchangeRate={exchangeRate}
                />
              ))
            ) : (
              <div className="glass-card" style={{ padding: '2rem', textAlign: 'center' }}>
                <p className="text-muted">ไม่พบข้อมูลในพอร์ต "{activeSubTab}"</p>
              </div>
            )}
          </AnimatePresence>
        )}
      </div>

      <AnimatePresence>
        {selectedStock && (
          <UpdateModal 
            stock={selectedStock} 
            onClose={() => setSelectedStock(null)} 
            onUpdateSuccess={fetchData} 
          />
        )}
      </AnimatePresence>

    </div>
  );
}

function SummaryCard({ label, value, subValue, icon, delay, numValue, colorMode = 'financial' }) {
  const getValueColor = () => {
    if (numValue === undefined || numValue === null) return '';
    if (colorMode === 'binary') {
      return numValue === 0 ? 'color-grey' : 'color-black';
    }
    if (numValue === 0) return 'color-grey';
    if (numValue > 0) return 'color-green';
    return 'color-red';
  };

  return (
    <motion.div 
      className="glass-card summary-card"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
        <span className="summary-label">{label}</span>
        <div style={{ background: '#f1f5f9', padding: '4px', borderRadius: '6px' }}>
          {icon}
        </div>
      </div>
      <div className={`summary-value ${getValueColor()}`}>{value}</div>
      {subValue && (
        <div className={`summary-sub-value ${getValueColor()}`}>{subValue}</div>
      )}
    </motion.div>
  );
}

function InteractiveTime({ label, dateStr, colorClass, customDisplay, customStyle }) {
  const [showPopover, setShowPopover] = useState(false);
  const popoverRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target)) {
        setShowPopover(false);
      }
    };
    if (showPopover) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPopover]);

  if (!dateStr) return null;

  const formattedDate = formatDate(dateStr);
  const relativeTime = getRelativeTime(dateStr);
  
  const displayVal = customDisplay || relativeTime || formattedDate;

  return (
    <div className={colorClass} style={{ display: 'flex', gap: '0.375rem', alignItems: 'baseline', position: 'relative' }}>
      {label && <span className="detail-label" style={{ fontSize: '0.7rem' }}>{label}</span>}
      <div style={{ position: 'relative', display: 'inline-block' }} ref={popoverRef}>
        <span 
          className="relative-time" 
          onClick={(e) => {
            e.stopPropagation();
            setShowPopover(!showPopover);
          }}
          style={{ 
            fontSize: '0.8rem', 
            fontWeight: 600, 
            cursor: 'pointer',
            padding: '2px 6px',
            borderRadius: '4px',
            transition: 'background 0.2s',
            userSelect: 'none',
            display: 'inline-block',
            ...customStyle
          }}
          title="คลิกเพื่อดูวันที่"
        >
          {displayVal}
        </span>
        
        <AnimatePresence>
          {showPopover && (
            <motion.div
              initial={{ opacity: 0, y: 5, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 5, scale: 0.95 }}
              transition={{ duration: 0.15 }}
              style={{
                position: 'absolute',
                bottom: '100%',
                left: '50%',
                transform: 'translateX(-50%)',
                marginBottom: '8px',
                background: '#1e293b',
                color: '#ffffff',
                padding: '6px 10px',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: 500,
                whiteSpace: 'nowrap',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
                zIndex: 10,
              }}
            >
              {formattedDate}
              <div 
                style={{
                  position: 'absolute',
                  top: '100%',
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: '0',
                  height: '0',
                  borderLeft: '5px solid transparent',
                  borderRight: '5px solid transparent',
                  borderTop: '5px solid #1e293b'
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

function StockCard({ stock, index, onUpdateClick, exchangeRate }) {
  const [logoError, setLogoError] = useState(false);
  const ticker = stock["ชื่อหุ้น"];
  const logoUrl = `https://assets.parqet.com/logos/symbol/${ticker}?format=png`;

  const DetailItem = ({ label, value, isMoney = false, relativeTime = '', colorClass = '' }) => {
    const parsedValue = parseFloat(value) || 0;
    return (
      <div className={`detail-item ${colorClass}`}>
        <span className="detail-label">{label}</span>
        <span className={`detail-value ${colorClass.startsWith('color-') ? colorClass : ''}`}>
          {isMoney ? `$${parsedValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : value || '-'}
          {relativeTime && <span className="relative-time"> {relativeTime}</span>}
        </span>
        {isMoney && (
          <span className={`detail-sub-value ${colorClass.startsWith('color-') ? colorClass : ''}`}>
            ฿{(parsedValue * exchangeRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        )}
      </div>
    );
  };

  const targetPrice = parseFloat(stock["ราคาตั้งซื้อ ($)"]) || 0;
  const targetAmount = targetPrice > 0 ? calculateTargetAmount(stock["วันที่กำหนด"], stock["ราคาตั้งซื้อ ($)"]) : 0;
  const remainingTarget = (stock.port === 'Trade' || targetPrice <= 0)
    ? 0
    : targetAmount - (parseFloat(stock["ยอดซื้อ ($)"]) || 0) + (parseFloat(stock["ยอดขาย ($)"]) || 0);
  const totalProfit = stock["สถานะ"] === "ขายแล้ว"
    ? (parseFloat(stock["ยอดขาย ($)"]) || 0) - (parseFloat(stock["ยอดซื้อ ($)"]) || 0)
    : 0;
  const taxVal = stock["ภาษีปันผล ($)"] || stock["ภาษี ($)"] || stock["ยอดภาษี ($)"] || 0;
  const netIncome = totalProfit + ((parseFloat(stock["ยอดปันผล ($)"]) || 0) - (parseFloat(taxVal) || 0));

  const getStatusColor = (val) => {
    if (val === 0) return 'status-grey';
    if (val < 0) return 'status-red';
    return 'status-green';
  };

  const getBinaryColorClass = (val) => {
    const num = parseFloat(val) || 0;
    return num === 0 ? 'color-grey' : 'color-black';
  };

  return (
    <motion.div 
      className="glass-card stock-card-expanded"
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ delay: index * 0.03 }}
    >
      <div className="stock-main-info">
        <a 
          href={stock["กราฟ"]} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="logo-link"
        >
          <div className="stock-icon" style={{ overflow: 'hidden' }}>
            {!logoError ? (
              <img 
                src={logoUrl} 
                alt={ticker} 
                onError={() => setLogoError(true)}
                style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '4px' }}
              />
            ) : (
              <span style={{ fontSize: '0.8rem' }}>{ticker.substring(0, 2)}</span>
            )}
          </div>
        </a>
        
        <div className="stock-info">
          <h3>
            {stock["ชื่อบริษัท"]}{' '}
            <span className="text-muted" style={{ fontWeight: 400, fontSize: '0.8rem' }}>({ticker})</span>
            {stock["มูลค่าตลาด ($)"] && (
              <span className="text-muted" style={{ fontWeight: 400, fontSize: '0.8rem', marginLeft: '0.5rem' }}>
                • มูลค่าตลาด {formatCurrency(parseFloat(stock["มูลค่าตลาด ($)"]) || 0)}
              </span>
            )}
          </h3>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <span className="market-tag">{stock["ตลาด"]}</span>
            <span className="text-muted" style={{ fontSize: '0.85rem' }}>{stock["ประเภท"]}</span>
            {stock["ลำดับการซื้อ"] && <span className="order-tag">ลำดับที่ {stock["ลำดับการซื้อ"]}</span>}
            {stock["สถานะ"] && (
              <span className={`status-badge ${
                stock["สถานะ"] === 'ถืออยู่' ? 'status-badge-holding' : 
                stock["สถานะ"] === 'ขายบางส่วน' ? 'status-badge-partial' : 
                stock["สถานะ"].includes('ขาย') ? 'status-badge-sold' : 'status-badge-other'
              }`}>
                {stock["สถานะ"]}
              </span>
            )}
          </div>
        </div>

        <div className="stock-stats">
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.375rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            <span className="detail-label">ราคาหุ้น</span>
            <span className="price-value">${(parseFloat(stock["ราคาหุ้น ($)"]) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
              (≈ ฿{((parseFloat(stock["ราคาหุ้น ($)"]) || 0) * exchangeRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
            </span>
          </div>
          <div className="dividend-tag" style={{ marginTop: '0.25rem', display: 'inline-block' }}>ปันผล {stock["อัตราปันผล (%)"]}%</div>
        </div>
      </div>

      <div className="stock-details-grid">
        <DetailItem label="ราคาตั้งซื้อ" value={stock["ราคาตั้งซื้อ ($)"]} isMoney={true} colorClass={getBinaryColorClass(stock["ราคาตั้งซื้อ ($)"])} />
        <DetailItem label="ยอดตั้งซื้อ" value={remainingTarget} isMoney={true} colorClass={getStatusColor(remainingTarget)} />
        <DetailItem label="ยอดซื้อ" value={stock["ยอดซื้อ ($)"]} isMoney={true} />
        <DetailItem label="ยอดขาย" value={stock["ยอดขาย ($)"]} isMoney={true} colorClass={getBinaryColorClass(stock["ยอดขาย ($)"])} />
        <DetailItem label="ยอดกำไร" value={totalProfit} isMoney={true} colorClass={getStatusColor(totalProfit)} />
        <DetailItem label="ยอดปันผล" value={stock["ยอดปันผล ($)"]} isMoney={true} colorClass={getBinaryColorClass(stock["ยอดปันผล ($)"])} />
        <DetailItem label="ยอดภาษี" value={taxVal} isMoney={true} colorClass={getBinaryColorClass(taxVal)} />
        <DetailItem label="รายได้" value={netIncome} isMoney={true} colorClass={getStatusColor(netIncome)} />
      </div>

      <div className="stock-card-footer" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {stock["วันที่ซื้อครั้งแรก"] && (
            <InteractiveTime 
              dateStr={stock["วันที่ซื้อครั้งแรก"]}
              customDisplay={`${stock["สถานะ"] === 'ขายแล้ว' ? 'ถือรวม' : 'ถือมา'} ${getHoldingAge(stock["วันที่ซื้อครั้งแรก"], stock["วันที่ขายล่าสุด"], stock["สถานะ"])}`}
              customStyle={{ background: '#e0f2fe', color: '#0369a1' }}
            />
          )}
          <InteractiveTime 
            label="ซื้อล่าสุด" 
            dateStr={stock["วันที่ซื้อล่าสุด"]} 
            colorClass={getTimeColor(stock["วันที่ซื้อล่าสุด"])} 
          />
          {stock["วันที่ขายล่าสุด"] && (
            <InteractiveTime 
              label="ขายล่าสุด" 
              dateStr={stock["วันที่ขายล่าสุด"]} 
            />
          )}
        </div>
        <button 
          className="update-card-btn"
          onClick={() => onUpdateClick(stock)}
        >
          <Edit size={14} />
          อัปเดต
        </button>
      </div>
    </motion.div>
  );
}

function UpdateModal({ stock, onClose, onUpdateSuccess }) {
  const [lastBuyDate, setLastBuyDate] = useState(() => {
    if (stock["วันที่ซื้อล่าสุด"]) {
      try {
        const date = new Date(stock["วันที่ซื้อล่าสุด"]);
        if (!isNaN(date.getTime())) {
          const y = date.getFullYear();
          const m = String(date.getMonth() + 1).padStart(2, '0');
          const d = String(date.getDate()).padStart(2, '0');
          return `${y}-${m}-${d}`;
        }
      } catch (e) {
        console.error(e);
      }
    }
    return '';
  });
  const [lastSellDate, setLastSellDate] = useState(() => {
    if (stock["วันที่ขายล่าสุด"]) {
      try {
        const date = new Date(stock["วันที่ขายล่าสุด"]);
        if (!isNaN(date.getTime())) {
          const y = date.getFullYear();
          const m = String(date.getMonth() + 1).padStart(2, '0');
          const d = String(date.getDate()).padStart(2, '0');
          return `${y}-${m}-${d}`;
        }
      } catch (e) {
        console.error(e);
      }
    }
    return '';
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [status, setStatus] = useState('idle'); // 'idle' | 'success' | 'error'
  const [statusMessage, setStatusMessage] = useState('');



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
      last_buy_date: lastBuyDate || null,
      last_sell_date: lastSellDate || null,
      buy_amount: getOrNull(buyAmount),
      sell_amount: getOrNull(sellAmount),
      dividend_amount: getOrNull(dividendAmount),
      tax_amount: getOrNull(taxAmount)
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
            <CheckCircle2 size={56} className="status-icon success-icon animate-bounce" />
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
            <AlertCircle size={56} className="status-icon error-icon" />
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
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem' }}>
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
                <div>
                  <h3 className="modal-title">อัปเดต {stock["ชื่อหุ้น"]}</h3>
                  <p className="modal-subtitle">{stock["ชื่อบริษัท"]} • พอร์ต: <span className="highlight-tag">{stock.port}</span></p>
                </div>
              </div>
              <button type="button" className="modal-close-btn" onClick={onClose}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">
                    <Calendar size={14} style={{ marginRight: '4px' }} />
                    วันที่ซื้อล่าสุด
                  </label>
                  <input 
                    type="date" 
                    className="form-input" 
                    value={lastBuyDate} 
                    onChange={(e) => setLastBuyDate(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">
                    <Calendar size={14} style={{ marginRight: '4px' }} />
                    วันที่ขายล่าสุด
                  </label>
                  <input 
                    type="date" 
                    className="form-input" 
                    value={lastSellDate} 
                    onChange={(e) => setLastSellDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">ยอดซื้อ ($)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    min="0"
                    placeholder="0.00"
                    className="form-input" 
                    value={buyAmount} 
                    onChange={(e) => setBuyAmount(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">ยอดขาย ($)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    min="0"
                    placeholder="0.00"
                    className="form-input" 
                    value={sellAmount} 
                    onChange={(e) => setSellAmount(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">ยอดปันผล ($)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    min="0"
                    placeholder="0.00"
                    className="form-input" 
                    value={dividendAmount} 
                    onChange={(e) => setDividendAmount(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">ภาษี ($)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    min="0"
                    placeholder="0.00"
                    className="form-input" 
                    value={taxAmount} 
                    onChange={(e) => setTaxAmount(e.target.value)}
                  />
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
                    <RefreshCw size={14} className="animate-spin" />
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

export default App;
