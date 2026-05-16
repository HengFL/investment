import React, { useState, useEffect, useMemo } from 'react';
import { TrendingUp, PieChart, DollarSign, Activity, ExternalLink, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const API_URL = 'https://script.google.com/macros/s/AKfycbwkjycorGKU-NDKVxETVhEC_BiKHhSuuUhMX4uZhDTIYi5KuoPjtIu5FzwE3Ahhc1HZ/exec';

function App() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('ทั้งหมด');

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

  const ports = useMemo(() => {
    const uniquePorts = [...new Set(data.map(item => item.port))].filter(Boolean);
    return ['ทั้งหมด', ...uniquePorts];
  }, [data]);

  const filteredData = useMemo(() => {
    if (activeTab === 'ทั้งหมด') return data;
    return data.filter(item => item.port === activeTab);
  }, [data, activeTab]);

  const summary = useMemo(() => {
    const totalMarketValue = data.reduce((acc, item) => acc + (parseFloat(item["มูลค่าตลาด ($)"]) || 0), 0);
    const totalStocks = data.length;
    const avgDividend = data.length > 0 
      ? data.reduce((acc, item) => acc + (parseFloat(item["อัตราปันผล (%)"]) || 0), 0) / data.length 
      : 0;
    
    return {
      totalMarketValue,
      totalStocks,
      avgDividend
    };
  }, [data]);

  const formatCurrency = (val) => {
    if (val >= 1e12) return `$${(val / 1e12).toFixed(2)}T`;
    if (val >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
    if (val >= 1e6) return `$${(val / 1e6).toFixed(2)}M`;
    return `$${val.toLocaleString()}`;
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
            ระบบติดตามหุ้น Invest
          </motion.h1>
          <p className="text-muted">ข้อมูลพอร์ตโฟลิโอและการวิเคราะห์แบบเรียลไทม์</p>
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

      {/* Mini Dashboard Summary */}
      <div className="summary-grid">
        <SummaryCard 
          label="มูลค่าตลาดรวม" 
          value={formatCurrency(summary.totalMarketValue)} 
          icon={<DollarSign size={20} color="var(--primary)" />}
          delay={0.1}
        />
        <SummaryCard 
          label="จำนวนหุ้นที่ถือ" 
          value={`${summary.totalStocks} รายการ`} 
          icon={<PieChart size={20} color="var(--secondary)" />}
          delay={0.2}
        />
        <SummaryCard 
          label="ปันผลเฉลี่ย" 
          value={`${summary.avgDividend.toFixed(2)}%`} 
          icon={<TrendingUp size={20} color="var(--success)" />}
          delay={0.3}
        />
        <SummaryCard 
          label="สถานะพอร์ต" 
          value="ปกติ" 
          icon={<Activity size={20} color="var(--warning)" />}
          delay={0.4}
        />
      </div>

      {/* Tabs */}
      <div className="tabs-container">
        {ports.map(port => (
          <button
            key={port}
            className={`tab-button ${activeTab === port ? 'active' : ''}`}
            onClick={() => setActiveTab(port)}
          >
            {port}
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
                <p className="text-muted">ไม่พบข้อมูลในพอร์ตนี้</p>
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
  return (
    <motion.div 
      className="glass-card stock-card"
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ delay: index * 0.03 }}
    >
      <div className="stock-icon">
        {stock["ชื่อหุ้น"]}
      </div>
      
      <div className="stock-info">
        <h3>{stock["ชื่อบริษัท"]}</h3>
        <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem', alignItems: 'center' }}>
          <span className="market-tag">{stock["ตลาด"]}</span>
          <span className="text-muted" style={{ fontSize: '0.85rem' }}>{stock["ประเภท"]}</span>
        </div>
      </div>

      <div className="stock-stats">
        <div className="price-value">${stock["ราคาหุ้น ($)"].toLocaleString()}</div>
        <div className="text-muted" style={{ fontSize: '0.8rem' }}>
          Market Cap: ${(stock["มูลค่าตลาด ($)"] / 1e9).toFixed(1)}B
        </div>
      </div>

      <div className="stock-action" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.4rem' }}>
        <div className="dividend-tag">
          ปันผล {stock["อัตราปันผล (%)"]}%
        </div>
        <a 
          href={stock["กราฟ"]} 
          target="_blank" 
          rel="noopener noreferrer"
          className="text-muted"
          style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', textDecoration: 'none', fontSize: '0.85rem' }}
        >
          ดูหน้ากราฟ <ExternalLink size={12} />
        </a>
      </div>
    </motion.div>
  );
}

export default App;
