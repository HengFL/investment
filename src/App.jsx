import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUp, PieChart, DollarSign, Activity, ExternalLink, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const API_URL = 'https://script.google.com/macros/s/AKfycbwkjycorGKU-NDKVxETVhEC_BiKHhSuuUhMX4uZhDTIYi5KuoPjtIu5FzwE3Ahhc1HZ/exec';

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
                <StockCard key={stock["ชื่อหุ้น"] + index} stock={stock} index={index} />
              ))
            ) : (
              <div className="glass-card" style={{ padding: '3rem', textAlign: 'center' }}>
                <p className="text-muted">ไม่พบข้อมูลในพอร์ต "{activeSubTab}"</p>
              </div>
            )}
          </AnimatePresence>
        )}
      </div>

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

function StockCard({ stock, index }) {
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
    </motion.div>
  );
}

export default App;
