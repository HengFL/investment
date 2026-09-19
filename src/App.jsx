import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactApexChart from 'react-apexcharts';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import Select from 'react-select';


import { API_URL } from './constants/api';
import { sortOptions, PORT_CATEGORIES } from './constants/options';
import { sortSelectStyles } from './constants/styles';
import { sortData, getSortValue } from './utils/sortUtils';
import { parseNumber, formatCurrency, maskFormattedMoney, calculateTargetAmount, formatTHB } from './utils/numberUtils';
import { parseDate } from './utils/dateUtils';
import SummaryCard from './components/SummaryCard';
import StockCard from './components/StockCard';
import UpdateModal from './components/UpdateModal';
import AssetCharts from './components/AssetCharts';
import InteractiveTime from './components/InteractiveTime';

function App() {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedStock, setSelectedStock] = useState(null);
  const [exchangeRate, setExchangeRate] = useState(36.5);
  const [showAmounts, setShowAmounts] = useState(() => {
    const saved = localStorage.getItem('show_amounts');
    return saved !== null ? JSON.parse(saved) : true;
  });

  useEffect(() => {
    localStorage.setItem('show_amounts', JSON.stringify(showAmounts));
  }, [showAmounts]);

  const [activeMainTab, setActiveMainTab] = useState('Hold');
  const [activeSubTab, setActiveSubTab] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('ลำดับที่');
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' | 'desc'
  const [viewMode, setViewMode] = useState('list');

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
      
      let json;
      try {
        json = await stockRes.clone().json();
      } catch (e) {
        const text = await stockRes.text();
        console.error("Failed to parse JSON. Response text:", text.substring(0, 500));
        throw e;
      }
      const rawData = Array.isArray(json) ? json : (json.data || []);
      const dataWithIndex = rawData.map((item, idx) => ({ ...item, originalIndex: idx }));
      setData(dataWithIndex);
      
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
    return data.filter(item => {
      const subPorts = PORT_CATEGORIES[activeMainTab];
      const matchesPort = activeSubTab === 'All'
        ? subPorts.includes(item.port)
        : item.port === activeSubTab;
        
      if (!matchesPort) return false;
      
      if (!searchQuery.trim()) return true;
      
      const query = searchQuery.toLowerCase().trim();
      const ticker = (item["ชื่อหุ้น"] || '').toLowerCase();
      
      return ticker.includes(query);
    });
  }, [data, activeSubTab, searchQuery, activeMainTab]);

  const sortedData = useMemo(() => {
    return [...filteredData].sort((a, b) => {
      const isDateOption = ['ซื้อล่าสุด', 'ขายล่าสุด', 'อายุการถือ'].includes(sortBy);
      
      if (isDateOption) {
        let dateKeyA = '';
        let dateKeyB = '';
        if (sortBy === 'ซื้อล่าสุด') {
          dateKeyA = a["วันที่ซื้อล่าสุด"];
          dateKeyB = b["วันที่ซื้อล่าสุด"];
        } else if (sortBy === 'ขายล่าสุด') {
          dateKeyA = a["วันที่ขายล่าสุด"];
          dateKeyB = b["วันที่ขายล่าสุด"];
        } else if (sortBy === 'อายุการถือ') {
          dateKeyA = a["วันที่ซื้อครั้งแรก"];
          dateKeyB = b["วันที่ซื้อครั้งแรก"];
        }

        const hasA = !!dateKeyA;
        const hasB = !!dateKeyB;

        if (!hasA && !hasB) return 0;
        if (!hasA) return 1; // b comes first (missing dates placed at the end)
        if (!hasB) return -1; // a comes first

        const dateA = parseDate(dateKeyA);
        const dateB = parseDate(dateKeyB);
        const valA = dateA ? dateA.getTime() : 0;
        const valB = dateB ? dateB.getTime() : 0;

        let comparison = 0;
        if (sortBy === 'อายุการถือ') {
          comparison = valA - valB; // older date = longer hold = larger holding age
        } else {
          comparison = valB - valA; // newer date first
        }

        return sortOrder === 'asc' ? -comparison : comparison;
      }

      const valA = getSortValue(a, sortBy, a.originalIndex !== undefined ? a.originalIndex : 0);
      const valB = getSortValue(b, sortBy, b.originalIndex !== undefined ? b.originalIndex : 0);

      if (valA === valB) return 0;
      
      let comparison = valA > valB ? 1 : -1;
      return sortOrder === 'asc' ? comparison : -comparison;
    });
  }, [filteredData, sortBy, sortOrder]);

  const handleSortChange = (newSortBy) => {
    setSortBy(newSortBy);
    if (newSortBy === 'ลำดับที่') {
      setSortOrder('asc');
    } else {
      setSortOrder('desc');
    }
  };

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
    
    // Count held and not held stocks based on status
    const heldCount = mainTabData.filter(item => 
      ['ซื้อแล้ว', 'รอขาย', 'ขายบางส่วน'].includes(item["สถานะ"])
    ).length;
    
    const notHeldCount = mainTabData.filter(item => 
      ['ขายแล้ว', 'รอซื้อ'].includes(item["สถานะ"])
    ).length;

    const avgDividend = mainTabData.length > 0 
      ? mainTabData.reduce((acc, item) => acc + parseNumber(item["อัตราปันผล (%)"]), 0) / mainTabData.length 
      : 0;
    
    const avgClearRate = mainTabData.length > 0 
      ? mainTabData.reduce((acc, item) => acc + (parseFloat(item["อัตรากำจัด (%)"]) || parseFloat(item["clear_rate"]) || 0), 0) / mainTabData.length 
      : 0;
    
    // Sums for the new requested cards
    const totalTargetPrice = mainTabData.reduce((acc, item) => acc + parseNumber(item["ราคาตั้งซื้อ ($)"]), 0);
    const totalBuyAmount = mainTabData.reduce((acc, item) => acc + parseNumber(item["ยอดซื้อ ($)"]), 0);
    const totalSellAmount = mainTabData.reduce((acc, item) => acc + parseNumber(item["ยอดขาย ($)"]), 0);
    
    // Total Remaining Target (Need to calculate per item then sum)
    const totalRemainingTarget = mainTabData.reduce((acc, item) => {
      const targetPrice = parseNumber(item["ราคาตั้งซื้อ ($)"]);
      if (item.port !== 'Trade' && targetPrice > 0) {
        const targetAmount = calculateTargetAmount(item["วันที่กำหนด"], item["ราคาตั้งซื้อ ($)"]);
        const remainingTarget = targetAmount - parseNumber(item["ยอดซื้อ ($)"]) + parseNumber(item["ยอดขาย ($)"]);
        return acc + remainingTarget;
      }
      return acc;
    }, 0);

    // Total Target Clear Amount (Need to calculate per item then sum)
    const totalTargetClearAmount = mainTabData.reduce((acc, item) => {
      const dividendAmount = parseNumber(item["ยอดปันผล ($)"]);
      const taxVal = item["ภาษีปันผล ($)"] || item["ภาษี ($)"] || item["ยอดภาษี ($)"] || 0;
      const taxAmount = parseNumber(taxVal);
      const clearRateVal = parseFloat(item["อัตรากำจัด (%)"]) || parseFloat(item["clear_rate"]) || 0;
      const clearAmountVal = item["ยอดกำจัด ($)"] || item["clear_amount"] || 0;
      
      const targetClear = (dividendAmount - taxAmount) * (clearRateVal / 100) - parseNumber(clearAmountVal);
      return acc + targetClear;
    }, 0);
    const roundedTotalTargetClearAmount = Math.round(totalTargetClearAmount * 100) / 100;


    // Sum of Total Profit/Loss (only calculated for status 'ขายแล้ว' and 'รอซื้อ')
    const totalProfitSum = mainTabData.reduce((acc, item) => {
      if (item["สถานะ"] === "ขายแล้ว" || item["สถานะ"] === "รอซื้อ") {
        const profit = parseNumber(item["ยอดขาย ($)"]) - parseNumber(item["ยอดซื้อ ($)"]);
        return acc + profit;
      }
      return acc;
    }, 0);

    // Sum of Total Buy Amount for only 'ขายแล้ว' and 'รอซื้อ' status
    const soldOrWaitBuyTotalBuyAmount = mainTabData.reduce((acc, item) => {
      if (item["สถานะ"] === "ขายแล้ว" || item["สถานะ"] === "รอซื้อ") {
        return acc + parseNumber(item["ยอดซื้อ ($)"]);
      }
      return acc;
    }, 0);

    // Total Profit percentage from total buy amount of sold/wait buy stocks
    const totalProfitPercent = soldOrWaitBuyTotalBuyAmount > 0 ? (totalProfitSum / soldOrWaitBuyTotalBuyAmount) * 100 : 0;

    // Sum of Total Dividend
    const totalDividendSum = mainTabData.reduce((acc, item) => acc + parseNumber(item["ยอดปันผล ($)"]), 0);

    // Sum of Total Tax
    const totalTaxSum = mainTabData.reduce((acc, item) => {
      const taxVal = item["ภาษีปันผล ($)"] || item["ภาษี ($)"] || item["ยอดภาษี ($)"] || 0;
      return acc + parseNumber(taxVal);
    }, 0);

    // Sum of Total Clear Amount
    const totalClearSum = mainTabData.reduce((acc, item) => {
      const clearVal = item ? (item["ยอดกำจัด ($)"] || item["clear_amount"]) : 0;
      return acc + parseNumber(clearVal);
    }, 0);

    // Sum of Total Net Income
    const totalIncomeSum = totalProfitSum + (totalDividendSum - totalTaxSum) - totalClearSum;
    
    // Net profit percentage from total buy amount
    const netProfitPercent = totalBuyAmount > 0 ? (totalIncomeSum / totalBuyAmount) * 100 : 0;
    
    // Total Dividend percentage from total buy amount
    const totalDividendPercent = totalBuyAmount > 0 ? (totalDividendSum / totalBuyAmount) * 100 : 0;

    // Total Tax percentage from total dividend sum
    const totalTaxPercent = totalDividendSum > 0 ? (totalTaxSum / totalDividendSum) * 100 : 0;

    // Total Clear percentage from net dividend
    const totalDividendNet = totalDividendSum - totalTaxSum;
    const totalClearPercent = totalDividendNet > 0 ? (totalClearSum / totalDividendNet) * 100 : 0;

    // Total Gross Profit Sum (totalProfitSum + totalDividendSum)
    const totalGrossProfitSum = totalProfitSum + totalDividendSum;
    const totalGrossProfitPercent = totalBuyAmount > 0 ? (totalGrossProfitSum / totalBuyAmount) * 100 : 0;

    return {
      totalStocks,
      heldCount,
      notHeldCount,
      avgDividend,
      avgClearRate,
      totalTargetPrice,
      totalBuyAmount,
      totalSellAmount,
      totalRemainingTarget,
      totalTargetClearAmount: roundedTotalTargetClearAmount,
      totalProfitSum,

      totalProfitPercent,
      totalDividendSum,
      totalDividendPercent,
      totalTaxSum,
      totalTaxPercent,
      totalClearSum,
      totalClearPercent,
      totalGrossProfitSum,
      totalGrossProfitPercent,
      totalIncomeSum,
      netProfitPercent
    };
  }, [mainTabData]);

  const handleMainTabChange = (mainTab) => {
    setActiveMainTab(mainTab);
    setActiveSubTab('All');
    setSearchQuery('');
    setSortBy('ลำดับที่');
    setSortOrder('asc');
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
    <>
      <div className="liquid-bg-container">
        <div className="liquid-blob blob-1"></div>
        <div className="liquid-blob blob-2"></div>
        <div className="liquid-blob blob-3"></div>
        <div className="liquid-blob blob-4"></div>
      </div>
      <div className="container">
      <header style={{ marginBottom: '1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <motion.h1 
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
          >
            Investment
          </motion.h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.625rem', flexWrap: 'wrap' }}>
            <p className="text-muted">หุ้นสหรัฐ</p>
            <span className="exchange-rate-badge" title="อัปเดตเรียลไทม์จาก open.er-api.com">
              1 USD ≈ ฿{exchangeRate.toFixed(2)}
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <button 
            className="eye-toggle-button"
            onClick={() => setShowAmounts(!showAmounts)}
            title={showAmounts ? "ซ่อนตัวเลขเงิน" : "แสดงตัวเลขเงิน"}
          >
            <i className={`fa-solid ${showAmounts ? 'fa-eye' : 'fa-eye-slash'}`} style={{ fontSize: '14px' }}></i>
          </button>
          <button 
            className="refresh-button" 
            onClick={fetchData} 
            disabled={loading}
            title={loading ? 'กำลังรีเฟรช...' : 'รีเฟรชใหม่'}
          >
            <i className={`fa-solid fa-arrows-rotate ${loading ? 'animate-spin' : ''}`} style={{ fontSize: '14px' }}></i>
          </button>
        </div>
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
      <h2 className="section-title animate-fade-in">
        <span>ภาพรวมพอร์ต</span>
        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--primary)', background: 'rgba(79, 70, 229, 0.08)', padding: '0.15rem 0.5rem', borderRadius: '6px' }}>{activeMainTab}</span>
      </h2>
      <div className="summary-grid">
        <SummaryCard 
          label="จำนวนหุ้น" 
          value={`${summary.totalStocks} หุ้น`}
          subValue={
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', marginTop: '0.2rem' }}>
              <span className="status-badge" style={{ 
                fontSize: '0.65rem', 
                padding: '0.15rem 0.45rem', 
                borderRadius: '20px', 
                lineHeight: '1', 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '0.2rem', 
                background: 'rgba(4, 120, 87, 0.1)', 
                color: '#047857', 
                border: '1px solid rgba(4, 120, 87, 0.2)',
                fontWeight: 700
              }} title="ถืออยู่">
                <i className="fa-solid fa-circle-check" style={{ fontSize: '0.7rem' }}></i>
                <span>{summary.heldCount} หุ้น</span>
              </span>
              <span className="status-badge" style={{ 
                fontSize: '0.65rem', 
                padding: '0.15rem 0.45rem', 
                borderRadius: '20px', 
                lineHeight: '1', 
                display: 'inline-flex', 
                alignItems: 'center', 
                gap: '0.2rem', 
                background: summary.notHeldCount > 0 ? 'rgba(71, 85, 105, 0.1)' : 'rgba(148, 163, 184, 0.06)', 
                color: summary.notHeldCount > 0 ? '#475569' : '#94a3b8', 
                border: summary.notHeldCount > 0 ? '1px solid rgba(71, 85, 105, 0.2)' : '1px solid rgba(148, 163, 184, 0.15)',
                fontWeight: 700
              }} title="ไม่ถือ/ขายแล้ว/รอซื้อ">
                <i className="fa-solid fa-circle-xmark" style={{ fontSize: '0.7rem' }}></i>
                <span>{summary.notHeldCount} หุ้น</span>
              </span>
            </div>
          }
          icon={<i className="fa-solid fa-chart-pie" style={{ fontSize: '18px', color: '#8b5cf6' }}></i>}
          iconBgColor="rgba(139, 92, 246, 0.1)"
          delay={0.1}
          numValue={summary.totalStocks}
          colorMode="binary"
        />
        <SummaryCard 
          label="ราคาตั้งซื้อทั้งหมด" 
          value={showAmounts ? formatCurrency(summary.totalTargetPrice) : maskFormattedMoney(formatCurrency(summary.totalTargetPrice))} 
          subValue={showAmounts ? formatTHB(summary.totalTargetPrice * exchangeRate) : maskFormattedMoney(formatTHB(summary.totalTargetPrice * exchangeRate))}
          icon={<i className="fa-solid fa-bullseye" style={{ fontSize: '18px', color: '#3b82f6' }}></i>}
          iconBgColor="rgba(59, 130, 246, 0.1)"
          delay={0.3}
          numValue={summary.totalTargetPrice}
          colorMode="binary"
        />
        <SummaryCard 
          label="ยอดตั้งซื้อทั้งหมด" 
          value={showAmounts ? formatCurrency(summary.totalRemainingTarget) : maskFormattedMoney(formatCurrency(summary.totalRemainingTarget))} 
          subValue={showAmounts ? formatTHB(summary.totalRemainingTarget * exchangeRate) : maskFormattedMoney(formatTHB(summary.totalRemainingTarget * exchangeRate))}
          icon={<i className="fa-solid fa-bars-progress" style={{ fontSize: '18px', color: '#f59e0b' }}></i>}
          iconBgColor="rgba(245, 158, 11, 0.1)"
          delay={0.4}
          numValue={summary.totalRemainingTarget}
          colorMode="binary"
        />
        <SummaryCard 
          label="ยอดตั้งกำจัดทั้งหมด" 
          value={showAmounts ? formatCurrency(summary.totalTargetClearAmount) : maskFormattedMoney(formatCurrency(summary.totalTargetClearAmount))} 
          subValue={showAmounts ? formatTHB(summary.totalTargetClearAmount * exchangeRate) : maskFormattedMoney(formatTHB(summary.totalTargetClearAmount * exchangeRate))}
          icon={<i className="fa-solid fa-filter" style={{ fontSize: '18px', color: '#06b6d4' }}></i>}
          iconBgColor="rgba(6, 180, 212, 0.1)"
          delay={0.45}
          numValue={summary.totalTargetClearAmount}
          colorMode="binary"
        />

        <SummaryCard 
          label="ยอดซื้อทั้งหมด" 
          value={showAmounts ? formatCurrency(summary.totalBuyAmount) : maskFormattedMoney(formatCurrency(summary.totalBuyAmount))} 
          subValue={showAmounts ? formatTHB(summary.totalBuyAmount * exchangeRate) : maskFormattedMoney(formatTHB(summary.totalBuyAmount * exchangeRate))}
          icon={<i className="fa-solid fa-cart-shopping" style={{ fontSize: '18px', color: '#6366f1' }}></i>}
          iconBgColor="rgba(99, 102, 241, 0.1)"
          delay={0.5}
          numValue={summary.totalBuyAmount}
          colorMode="binary"
        />
        <SummaryCard 
          label="ยอดขายทั้งหมด" 
          value={showAmounts ? formatCurrency(summary.totalSellAmount) : maskFormattedMoney(formatCurrency(summary.totalSellAmount))} 
          subValue={showAmounts ? formatTHB(summary.totalSellAmount * exchangeRate) : maskFormattedMoney(formatTHB(summary.totalSellAmount * exchangeRate))}
          icon={<i className="fa-solid fa-hand-holding-dollar" style={{ fontSize: '18px', color: '#10b981' }}></i>}
          iconBgColor="rgba(16, 185, 129, 0.1)"
          delay={0.6}
          numValue={summary.totalSellAmount}
          colorMode="binary"
        />
        <SummaryCard 
          label="ยอดปันผลทั้งหมด" 
          value={showAmounts ? formatCurrency(summary.totalDividendSum) : maskFormattedMoney(formatCurrency(summary.totalDividendSum))} 
          subValue={
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: '0.25rem', opacity: 1 }}>
              <span>{showAmounts ? formatTHB(summary.totalDividendSum * exchangeRate) : maskFormattedMoney(formatTHB(summary.totalDividendSum * exchangeRate))}</span>
              <span 
                style={{ 
                  fontSize: '0.65rem', 
                  padding: '0.2rem 0.5rem', 
                  borderRadius: '20px', 
                  fontWeight: 700, 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '0.15rem', 
                  lineHeight: '1', 
                  background: summary.totalDividendSum === 0 ? 'rgba(148, 163, 184, 0.1)' : summary.totalDividendSum > 0 ? 'rgba(4, 120, 87, 0.1)' : 'rgba(220, 38, 38, 0.1)', 
                  color: summary.totalDividendSum === 0 ? '#94a3b8' : summary.totalDividendSum > 0 ? '#047857' : '#dc2626', 
                  border: `1px solid ${summary.totalDividendSum === 0 ? 'rgba(148, 163, 184, 0.2)' : summary.totalDividendSum > 0 ? 'rgba(4, 120, 87, 0.2)' : 'rgba(220, 38, 38, 0.2)'}` 
                }}
              >
                {summary.totalDividendSum !== 0 && (
                  <i className={`fa-solid ${summary.totalDividendSum > 0 ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down'}`} style={{ fontSize: '0.65rem' }}></i>
                )}
                {summary.totalDividendSum > 0 ? '+' : ''}{summary.totalDividendPercent.toFixed(2)}%
              </span>
            </div>
          }
          icon={<i className="fa-solid fa-coins" style={{ fontSize: '18px', color: '#eab308' }}></i>}
          iconBgColor="rgba(234, 179, 8, 0.1)"
          delay={0.7}
          numValue={summary.totalDividendSum}
          colorMode="financial-dark"
        />
        <SummaryCard 
          label="ยอดภาษีทั้งหมด" 
          value={showAmounts ? formatCurrency(summary.totalTaxSum) : maskFormattedMoney(formatCurrency(summary.totalTaxSum))} 
          subValue={
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: '0.25rem', opacity: 1 }}>
              <span>{showAmounts ? formatTHB(summary.totalTaxSum * exchangeRate) : maskFormattedMoney(formatTHB(summary.totalTaxSum * exchangeRate))}</span>
              <span 
                style={{ 
                  fontSize: '0.65rem', 
                  padding: '0.2rem 0.5rem', 
                  borderRadius: '20px', 
                  fontWeight: 700, 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '0.15rem', 
                  lineHeight: '1', 
                  background: summary.totalTaxSum > 0 ? 'rgba(234, 88, 12, 0.1)' : 'rgba(148, 163, 184, 0.1)', 
                  color: summary.totalTaxSum > 0 ? '#ea580c' : '#94a3b8', 
                  border: `1px solid ${summary.totalTaxSum > 0 ? 'rgba(234, 88, 12, 0.2)' : 'rgba(148, 163, 184, 0.2)'}` 
                }}
              >
                {summary.totalTaxSum > 0 ? '+' : ''}{summary.totalTaxPercent.toFixed(2)}%
              </span>
            </div>
          }
          icon={<i className="fa-solid fa-file-invoice-dollar" style={{ fontSize: '18px', color: '#f43f5e' }}></i>}
          iconBgColor="rgba(244, 63, 94, 0.1)"
          delay={0.8}
          numValue={summary.totalTaxSum}
          colorMode="orange"
        />
        <SummaryCard 
          label="ยอดกำจัดทั้งหมด" 
          value={showAmounts ? formatCurrency(summary.totalClearSum) : maskFormattedMoney(formatCurrency(summary.totalClearSum))} 
          subValue={
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: '0.25rem', opacity: 1 }}>
              <span>{showAmounts ? formatTHB(summary.totalClearSum * exchangeRate) : maskFormattedMoney(formatTHB(summary.totalClearSum * exchangeRate))}</span>
              <span 
                style={{ 
                  fontSize: '0.65rem', 
                  padding: '0.2rem 0.5rem', 
                  borderRadius: '20px', 
                  fontWeight: 700, 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '0.15rem', 
                  lineHeight: '1', 
                  background: summary.totalClearSum > 0 ? 'rgba(234, 88, 12, 0.1)' : 'rgba(148, 163, 184, 0.1)', 
                  color: summary.totalClearSum > 0 ? '#ea580c' : '#94a3b8', 
                  border: `1px solid ${summary.totalClearSum > 0 ? 'rgba(234, 88, 12, 0.2)' : 'rgba(148, 163, 184, 0.2)'}` 
                }}
              >
                {summary.totalClearSum > 0 ? '+' : ''}{summary.totalClearPercent.toFixed(2)}%
              </span>
            </div>
          }
          icon={<i className="fa-solid fa-scissors" style={{ fontSize: '18px', color: '#f97316' }}></i>}
          iconBgColor="rgba(249, 115, 22, 0.1)"
          delay={0.9}
          numValue={summary.totalClearSum}
          colorMode="orange"
        />
        <SummaryCard 
          label="กำไรขายทั้งหมด" 
          value={showAmounts ? formatCurrency(summary.totalProfitSum) : maskFormattedMoney(formatCurrency(summary.totalProfitSum))} 
          subValue={
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: '0.25rem', opacity: 1 }}>
              <span>{showAmounts ? formatTHB(summary.totalProfitSum * exchangeRate) : maskFormattedMoney(formatTHB(summary.totalProfitSum * exchangeRate))}</span>
              <span 
                style={{ 
                  fontSize: '0.65rem', 
                  padding: '0.2rem 0.5rem', 
                  borderRadius: '20px', 
                  fontWeight: 700, 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '0.15rem', 
                  lineHeight: '1', 
                  background: summary.totalProfitSum === 0 ? 'rgba(148, 163, 184, 0.1)' : summary.totalProfitSum > 0 ? 'rgba(4, 120, 87, 0.1)' : 'rgba(220, 38, 38, 0.1)', 
                  color: summary.totalProfitSum === 0 ? '#94a3b8' : summary.totalProfitSum > 0 ? '#047857' : '#dc2626', 
                  border: `1px solid ${summary.totalProfitSum === 0 ? 'rgba(148, 163, 184, 0.2)' : summary.totalProfitSum > 0 ? 'rgba(4, 120, 87, 0.2)' : 'rgba(220, 38, 38, 0.2)'}` 
                }}
              >
                {summary.totalProfitSum !== 0 && (
                  <i className={`fa-solid ${summary.totalProfitSum > 0 ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down'}`} style={{ fontSize: '0.65rem' }}></i>
                )}
                {summary.totalProfitSum > 0 ? '+' : ''}{summary.totalProfitPercent.toFixed(2)}%
              </span>
            </div>
          }
          icon={<i className="fa-solid fa-arrow-trend-up" style={{ fontSize: '18px', color: '#14b8a6' }}></i>}
          iconBgColor="rgba(20, 184, 166, 0.1)"
          delay={1.0}
          numValue={summary.totalProfitSum}
          colorMode="financial-dark"
        />
        <SummaryCard 
          label="กำไรรวมทั้งหมด" 
          value={showAmounts ? formatCurrency(summary.totalGrossProfitSum) : maskFormattedMoney(formatCurrency(summary.totalGrossProfitSum))} 
          subValue={
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: '0.25rem', opacity: 1 }}>
              <span>{showAmounts ? formatTHB(summary.totalGrossProfitSum * exchangeRate) : maskFormattedMoney(formatTHB(summary.totalGrossProfitSum * exchangeRate))}</span>
              <span 
                style={{ 
                  fontSize: '0.65rem', 
                  padding: '0.2rem 0.5rem', 
                  borderRadius: '20px', 
                  fontWeight: 700, 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '0.15rem', 
                  lineHeight: '1', 
                  background: summary.totalGrossProfitSum === 0 ? 'rgba(148, 163, 184, 0.1)' : summary.totalGrossProfitSum > 0 ? 'rgba(4, 120, 87, 0.1)' : 'rgba(220, 38, 38, 0.1)', 
                  color: summary.totalGrossProfitSum === 0 ? '#94a3b8' : summary.totalGrossProfitSum > 0 ? '#047857' : '#dc2626', 
                  border: `1px solid ${summary.totalGrossProfitSum === 0 ? 'rgba(148, 163, 184, 0.2)' : summary.totalGrossProfitSum > 0 ? 'rgba(4, 120, 87, 0.2)' : 'rgba(220, 38, 38, 0.2)'}` 
                }}
              >
                {summary.totalGrossProfitSum !== 0 && (
                  <i className={`fa-solid ${summary.totalGrossProfitSum > 0 ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down'}`} style={{ fontSize: '0.65rem' }}></i>
                )}
                {summary.totalGrossProfitSum > 0 ? '+' : ''}{summary.totalGrossProfitPercent.toFixed(2)}%
              </span>
            </div>
          }
          icon={<i className="fa-solid fa-chart-line" style={{ fontSize: '18px', color: '#059669' }}></i>}
          iconBgColor="rgba(5, 150, 105, 0.1)"
          delay={1.1}
          numValue={summary.totalGrossProfitSum}
          colorMode="financial-dark"
        />
        <SummaryCard 
          label="กำไรสุทธิทั้งหมด" 
          value={showAmounts ? formatCurrency(summary.totalIncomeSum) : maskFormattedMoney(formatCurrency(summary.totalIncomeSum))} 
          subValue={
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%', flexWrap: 'wrap', gap: '0.25rem', opacity: 1 }}>
              <span>{showAmounts ? formatTHB(summary.totalIncomeSum * exchangeRate) : maskFormattedMoney(formatTHB(summary.totalIncomeSum * exchangeRate))}</span>
              <span 
                style={{ 
                  fontSize: '0.65rem', 
                  padding: '0.2rem 0.5rem', 
                  borderRadius: '20px', 
                  fontWeight: 700, 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '0.15rem', 
                  lineHeight: '1', 
                  background: summary.totalIncomeSum === 0 ? 'rgba(148, 163, 184, 0.1)' : summary.totalIncomeSum > 0 ? 'rgba(4, 120, 87, 0.1)' : 'rgba(220, 38, 38, 0.1)', 
                  color: summary.totalIncomeSum === 0 ? '#94a3b8' : summary.totalIncomeSum > 0 ? '#047857' : '#dc2626', 
                  border: `1px solid ${summary.totalIncomeSum === 0 ? 'rgba(148, 163, 184, 0.2)' : summary.totalIncomeSum > 0 ? 'rgba(4, 120, 87, 0.2)' : 'rgba(220, 38, 38, 0.2)'}` 
                }}
              >
                {summary.totalIncomeSum !== 0 && (
                  <i className={`fa-solid ${summary.totalIncomeSum > 0 ? 'fa-arrow-trend-up' : 'fa-arrow-trend-down'}`} style={{ fontSize: '0.65rem' }}></i>
                )}
                {summary.totalIncomeSum > 0 ? '+' : ''}{summary.netProfitPercent.toFixed(2)}%
              </span>
            </div>
          }
          icon={<i className="fa-solid fa-wallet" style={{ fontSize: '18px', color: '#ec4899' }}></i>}
          iconBgColor="rgba(236, 72, 153, 0.1)"
          delay={1.2}
          numValue={summary.totalIncomeSum}
          colorMode="financial-dark"
        />
      </div>

      {/* List Controls: Sub Tabs & Search */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem', flexWrap: 'wrap', gap: '0.5rem' }}>
        <h2 className="section-title animate-fade-in" style={{ margin: 0 }}>
          <span>รายการสินทรัพย์</span>
          {activeSubTab !== 'All' && (
            <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--secondary)', background: 'rgba(219, 39, 119, 0.08)', padding: '0.15rem 0.5rem', borderRadius: '6px', marginLeft: '0.5rem' }}>{activeSubTab}</span>
          )}
        </h2>
        <div className="view-toggle-container glass-card" style={{ padding: '0.25rem', display: 'flex', gap: '0.25rem', borderRadius: '0.5rem', background: 'rgba(255, 255, 255, 0.5)' }}>
          <button 
            className={`view-toggle-btn ${viewMode === 'list' ? 'active' : ''}`}
            onClick={() => setViewMode('list')}
            title="List View"
          >
            <i className="fa-solid fa-list"></i>
          </button>
          <button 
            className={`view-toggle-btn ${viewMode === 'chart' ? 'active' : ''}`}
            onClick={() => setViewMode('chart')}
            title="Chart View"
          >
            <i className="fa-solid fa-chart-pie"></i>
          </button>
        </div>
      </div>
      <div className="list-controls-container">
        <div className="tabs-container">
          {/* Tab All at the very front */}
          <button
            key="All"
            className={`tab-button ${activeSubTab === 'All' ? 'active' : ''}`}
            onClick={() => setActiveSubTab('All')}
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem' }}
          >
            <span>All</span>
            <span className="tab-count-badge">
              {mainTabData.length}
            </span>
          </button>

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
        
        <div className="search-and-sort-container">
          <div className="search-container">
            <i className="fa-solid fa-magnifying-glass search-icon" style={{ fontSize: '16px' }}></i>
            <input
              type="text"
              placeholder="ค้นหาชื่อหุ้น..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
            {searchQuery && (
              <button 
                className="clear-search-btn" 
                onClick={() => setSearchQuery('')}
                title="ล้างคำค้นหา"
              >
                <i className="fa-solid fa-xmark" style={{ fontSize: '16px' }}></i>
              </button>
            )}
          </div>

          <div className="sort-container">
            <span className="sort-label">เรียงตาม</span>
            <Select
              options={sortOptions}
              value={sortOptions.find(opt => opt.value === sortBy)}
              onChange={(selected) => handleSortChange(selected ? selected.value : '')}
              className="sort-select-container"
              classNamePrefix="react-select"
              styles={sortSelectStyles}
              isSearchable={false}
              menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
            />
            <button 
              type="button"
              className="sort-toggle-btn"
              onClick={() => setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc')}
              title={sortOrder === 'asc' ? 'เรียงจากน้อยไปมาก' : 'เรียงจากมากไปน้อย'}
            >
              {sortOrder === 'asc' ? <i className="fa-solid fa-arrow-up-wide-short" style={{ fontSize: '16px' }}></i> : <i className="fa-solid fa-arrow-down-wide-short" style={{ fontSize: '16px' }}></i>}
            </button>
          </div>
        </div>
      </div>

      {/* Stock List or Charts */}
      <div className="stock-list-wrapper">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <p className="text-muted">กำลังโหลดข้อมูล...</p>
          </div>
        ) : viewMode === 'chart' ? (
          <AssetCharts data={sortedData} />
        ) : (
          <div className="stock-list">
            <AnimatePresence mode="popLayout">
            {sortedData.length > 0 ? (
              sortedData.map((stock, index) => (
                <StockCard 
                  key={stock["ชื่อหุ้น"] + stock.originalIndex} 
                  stock={stock} 
                  index={index} 
                  onUpdateClick={setSelectedStock} 
                  exchangeRate={exchangeRate}
                  showAmounts={showAmounts}
                />
              ))
            ) : (
              <div className="glass-card animate-fade-in" style={{ padding: '2.5rem 2rem', textAlign: 'center' }}>
                {searchQuery ? (
                  <>
                    <p className="text-muted" style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.75rem' }}>
                      ไม่พบผลลัพธ์ที่ตรงกับ "{searchQuery}"
                    </p>
                    <button 
                      className="tab-button" 
                      onClick={() => setSearchQuery('')}
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '0.375rem', padding: '0.45rem 1rem' }}
                    >
                      <i className="fa-solid fa-xmark" style={{ fontSize: '14px' }}></i>
                      ล้างคำค้นหา
                    </button>
                  </>
                ) : (
                  <p className="text-muted">
                    {activeSubTab === 'All' 
                      ? `ไม่พบข้อมูลในพอร์ตกลุ่ม "${activeMainTab}"` 
                      : `ไม่พบข้อมูลในพอร์ต "${activeSubTab}"`}
                  </p>
                )}
              </div>
            )}
          </AnimatePresence>
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedStock && (
          <UpdateModal 
            stock={selectedStock} 
            exchangeRate={exchangeRate}
            onClose={() => setSelectedStock(null)} 
            onUpdateSuccess={fetchData} 
          />
        )}
      </AnimatePresence>
      
      <footer style={{ textAlign: 'center', padding: '1rem 0 0.5rem', color: 'var(--text-muted, #64748b)', fontSize: '0.875rem', fontWeight: 500 }}>
        HengFL &copy; 2026
      </footer>
    </div>
    </>
  );
}


export default App;
