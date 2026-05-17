import React, { useState, useEffect, useMemo } from 'react';
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
  if (val >= 1e12) return `$${(val / 1e12).toFixed(2)}T`;
  if (val >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
  if (val >= 1e6) return `$${(val / 1e6).toFixed(2)}M`;
  return `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

function App() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedStock, setSelectedStock] = useState(null);
  const PORT_CATEGORIES = {
    'Hold': ['Extra', 'Main', 'Second', 'Addon', 'Begin', 'DR'],
    'Trade': ['Trade'],
    'Sale': ['Sale']
  };

  const [activeMainTab, setActiveMainTab] = useState('Hold');
  const [activeSubTab, setActiveSubTab] = useState('Main');

  const fetchData = async () => {
    setLoading(true);
    try {
      const response = await fetch(API_URL);
      const json = await response.json();
      setData(json);
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
      const targetAmount = calculateTargetAmount(item["วันที่กำหนด"], item["ราคาตั้งซื้อ ($)"]);
      const remainingTarget = targetAmount - (parseFloat(item["ยอดซื้อ ($)"]) || 0);
      return acc + remainingTarget;
    }, 0);
    
    return {
      totalStocks,
      avgDividend,
      totalTargetPrice,
      totalBuyAmount,
      totalSellAmount,
      totalRemainingTarget
    };
  }, [mainTabData]);

  const handleMainTabChange = (mainTab) => {
    setActiveMainTab(mainTab);
    setActiveSubTab(PORT_CATEGORIES[mainTab][0]);
  };

  if (error) {
    return (
      <div className="container" style={{ textAlign: 'center', paddingTop: '10rem' }}>
        <h2 style={{ color: 'var(--error)' }}>{error}</h2>
        <button className="tab-button active" onClick={fetchData} style={{ marginTop: '1rem' }}>
          ลองใหม่อีกครั้ง
        </button>
      </div>
    );
  }

  return (
    <div className="container">
      <header style={{ marginBottom: '2.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <motion.h1 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
          >
            Srock US
          </motion.h1>
          <p className="text-muted">หุ้นสหรัฐ</p>
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
          >
            {mainTab}
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
        />
        <SummaryCard 
          label="รวมราคาตั้งซื้อ" 
          value={formatCurrency(summary.totalTargetPrice)} 
          icon={<DollarSign size={20} color="var(--primary)" />}
          delay={0.3}
        />
        <SummaryCard 
          label="รวมยอดตั้งซื้อ" 
          value={formatCurrency(summary.totalRemainingTarget)} 
          icon={<Activity size={20} color="var(--warning)" />}
          delay={0.4}
        />
        <SummaryCard 
          label="รวมยอดซื้อรวม" 
          value={formatCurrency(summary.totalBuyAmount)} 
          icon={<DollarSign size={20} color="var(--success)" />}
          delay={0.5}
        />
        <SummaryCard 
          label="รวมยอดขายรวม" 
          value={formatCurrency(summary.totalSellAmount)} 
          icon={<DollarSign size={20} color="var(--error)" />}
          delay={0.6}
        />
      </div>

      {/* Sub Tabs */}
      <div className="tabs-container" style={{ marginBottom: '2rem' }}>
        {PORT_CATEGORIES[activeMainTab].map(subTab => (
          <button
            key={subTab}
            className={`tab-button ${activeSubTab === subTab ? 'active' : ''}`}
            onClick={() => setActiveSubTab(subTab)}
          >
            {subTab}
          </button>
        ))}
      </div>

      {/* Stock List */}
      <div className="stock-list">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '5rem' }}>
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
                />
              ))
            ) : (
              <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
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

function SummaryCard({ label, value, icon, delay }) {
  return (
    <motion.div 
      className="glass-card summary-card"
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
        <span className="summary-label">{label}</span>
        <div style={{ background: '#f1f5f9', padding: '6px', borderRadius: '8px' }}>
          {icon}
        </div>
      </div>
      <div className="summary-value">{value}</div>
    </motion.div>
  );
}

function StockCard({ stock, index, onUpdateClick }) {
  const [logoError, setLogoError] = useState(false);
  const ticker = stock["ชื่อหุ้น"];
  const logoUrl = `https://assets.parqet.com/logos/symbol/${ticker}?format=png`;

  const DetailItem = ({ label, value, isMoney = false, relativeTime = '', colorClass = '' }) => (
    <div className={`detail-item ${colorClass}`}>
      <span className="detail-label">{label}</span>
      <span className="detail-value">
        {isMoney ? `$${(parseFloat(value) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : value || '-'}
        {relativeTime && <span className="relative-time"> {relativeTime}</span>}
      </span>
    </div>
  );

  const targetAmount = calculateTargetAmount(stock["วันที่กำหนด"], stock["ราคาตั้งซื้อ ($)"]);
  const remainingTarget = targetAmount - (parseFloat(stock["ยอดซื้อ ($)"]) || 0);

  const getStatusColor = (val) => {
    if (val === 0) return 'status-grey';
    if (val < 0) return 'status-red';
    return 'status-green';
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
          <h3>{stock["ชื่อบริษัท"]} <span className="text-muted" style={{ fontWeight: 400, fontSize: '0.8rem' }}>({ticker})</span></h3>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem', alignItems: 'center' }}>
            <span className="market-tag">{stock["ตลาด"]}</span>
            <span className="text-muted" style={{ fontSize: '0.85rem' }}>{stock["ประเภท"]}</span>
            {stock["ลำดับการซื้อ"] && <span className="order-tag">ลำดับที่ {stock["ลำดับการซื้อ"]}</span>}
          </div>
        </div>

        <div className="stock-stats">
          <div className="price-value">${(parseFloat(stock["ราคาหุ้น ($)"]) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div className="dividend-tag">ปันผล {stock["อัตราปันผล (%)"]}%</div>
        </div>
      </div>

      <div className="stock-details-grid">
        <DetailItem label="ราคาตั้งซื้อ" value={stock["ราคาตั้งซื้อ ($)"]} isMoney={true} />
        <DetailItem label="ยอดตั้งซื้อ" value={remainingTarget} isMoney={true} colorClass={getStatusColor(remainingTarget)} />
        <DetailItem label="ยอดซื้อรวม" value={stock["ยอดซื้อ ($)"]} isMoney={true} />
        <DetailItem label="ยอดขายรวม" value={stock["ยอดขาย ($)"]} isMoney={true} />
        <DetailItem 
          label="ซื้อล่าสุด" 
          value={formatDate(stock["วันที่ซื้อล่าสุด"])} 
          relativeTime={getRelativeTime(stock["วันที่ซื้อล่าสุด"])}
          colorClass={getTimeColor(stock["วันที่ซื้อล่าสุด"])}
        />
        <DetailItem 
          label="ขายล่าสุด" 
          value={formatDate(stock["วันที่ขายล่าสุด"])} 
          relativeTime={getRelativeTime(stock["วันที่ขายล่าสุด"])} 
        />
      </div>

      <div className="stock-card-footer">
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
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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

  const handleDividendChange = (val) => {
    setDividendAmount(val);
    const parsed = parseFloat(val);
    if (!isNaN(parsed) && parsed > 0) {
      setTaxAmount((parsed * 0.15).toFixed(2));
    } else {
      setTaxAmount('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setStatus('idle');
    
    const requestData = {
      sheet_name: stock.port || 'Extra',
      symbol: stock["ชื่อหุ้น"],
      last_buy_date: lastBuyDate,
      buy_amount: parseFloat(buyAmount) || 0,
      sell_amount: parseFloat(sellAmount) || 0,
      dividend_amount: parseFloat(dividendAmount) || 0,
      tax_amount: parseFloat(taxAmount) || 0
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
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', width: '100%' }}>
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
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
                  <h3 className="modal-title">อัปเดตข้อมูล {stock["ชื่อหุ้น"]}</h3>
                  <p className="modal-subtitle">{stock["ชื่อบริษัท"]} • พอร์ต: <span className="highlight-tag">{stock.port}</span></p>
                </div>
              </div>
              <button type="button" className="modal-close-btn" onClick={onClose}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">
                  <Calendar size={14} style={{ marginRight: '4px' }} />
                  วันที่ดำเนินการ (Date)
                </label>
                <input 
                  type="date" 
                  className="form-input" 
                  value={lastBuyDate} 
                  onChange={(e) => setLastBuyDate(e.target.value)}
                  required 
                />
              </div>

              <div className="form-row-2">
                <div className="form-group">
                  <label className="form-label">ยอดซื้อ ($) (Buy Amount)</label>
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
                  <label className="form-label">ยอดขาย ($) (Sell Amount)</label>
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
                  <label className="form-label">ยอดปันผล ($) (Dividend Amount)</label>
                  <div style={{ position: 'relative' }}>
                    <input 
                      type="number" 
                      step="0.01" 
                      min="0"
                      placeholder="0.00"
                      className="form-input" 
                      value={dividendAmount} 
                      onChange={(e) => handleDividendChange(e.target.value)}
                      style={{ paddingRight: '4.5rem' }}
                    />
                    {dividendAmount && parseFloat(dividendAmount) > 0 && (
                      <button 
                        type="button" 
                        className="auto-calc-btn"
                        onClick={() => setTaxAmount((parseFloat(dividendAmount) * 0.15).toFixed(2))}
                        title="คำนวณหักภาษี ณ ที่จ่าย 15%"
                      >
                        หัก 15%
                      </button>
                    )}
                  </div>
                </div>
                <div className="form-group">
                  <label className="form-label">ภาษีปันผล ($) (Tax Amount)</label>
                  <input 
                    type="number" 
                    step="0.01" 
                    min="0"
                    placeholder="0.00"
                    className="form-input" 
                    value={taxAmount} 
                    onChange={(e) => setTaxAmount(e.target.value)}
                  />
                  <span className="input-helper">หักภาษี ณ ที่จ่ายปกติ 15% ของปันผล</span>
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
                ) : 'บันทึกข้อมูล'}
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}

export default App;
