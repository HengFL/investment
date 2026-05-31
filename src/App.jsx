import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import Select from 'react-select';

const API_URL = 'https://script.google.com/macros/s/AKfycbwkjycorGKU-NDKVxETVhEC_BiKHhSuuUhMX4uZhDTIYi5KuoPjtIu5FzwE3Ahhc1HZ/exec';
const UPDATE_API_URL = 'https://script.google.com/macros/s/AKfycbzNnoWQyuqBNn2y1kNq3ecRc8bTx_DeU5GmCCgF7y5ER3TOFZmiTWXnr_unNg6unYzS/exec';

const parseDate = (dateStr) => {
  if (!dateStr) return null;
  if (dateStr instanceof Date) return dateStr;
  
  const cleanStr = String(dateStr).trim();
  if (!cleanStr) return null;
  
  // Regular expression to match DD/MM/YYYY (with / or - separator, optionally followed by time)
  const dmyRegex = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})(?:\s+(\d{1,2}):(\d{1,2})(?::(\d{1,2}))?)?$/;
  const match = cleanStr.match(dmyRegex);
  
  if (match) {
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1; // Month is 0-indexed in JS
    let year = parseInt(match[3], 10);
    if (year < 100) {
      year += year < 50 ? 2000 : 1900;
    }
    const hour = match[4] ? parseInt(match[4], 10) : 0;
    const minute = match[5] ? parseInt(match[5], 10) : 0;
    const second = match[6] ? parseInt(match[6], 10) : 0;
    
    const parsedDate = new Date(year, month, day, hour, minute, second);
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate;
    }
  }
  
  const standardDate = new Date(cleanStr);
  if (!isNaN(standardDate.getTime())) {
    return standardDate;
  }
  
  return null;
};

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  try {
    const date = parseDate(dateStr);
    if (!date) return dateStr;
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
    const date = parseDate(dateStr);
    if (!date) return '';
    const now = new Date();
    
    // กรณีทำรายการวันนี้ ให้ขึ้นคำว่า วันนี้
    if (date.getDate() === now.getDate() &&
        date.getMonth() === now.getMonth() &&
        date.getFullYear() === now.getFullYear()) {
      return 'วันนี้';
    }

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
    const date = parseDate(dateStr);
    if (!date) return '';
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);
    const diffInMonths = diffInSeconds / (30 * 24 * 3600);
    
    if (diffInMonths <= 1) return 'time-fresh';
    if (diffInMonths <= 12) return 'time-warning-2';
    return 'time-danger';
  } catch (e) {
    return '';
  }
};

const getHoldingAge = (firstBuyDateStr, lastSellDateStr, status) => {
  if (!firstBuyDateStr) return '';
  try {
    const startDate = parseDate(firstBuyDateStr);
    if (!startDate) return '';
    
    let endDate = new Date();
    if (status === 'ขายแล้ว' && lastSellDateStr) {
      const sellDate = parseDate(lastSellDateStr);
      if (sellDate) {
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

const parseNumber = (val) => {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const cleaned = String(val).replace(/[^0-9.-]/g, '');
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
};

const calculateTargetAmount = (startDateStr, pricePerMonth) => {
  if (!startDateStr || !pricePerMonth) return 0;
  try {
    const start = parseDate(startDateStr);
    const now = new Date();
    if (!start) return 0;
    
    const years = now.getFullYear() - start.getFullYear();
    const months = (years * 12) + (now.getMonth() - start.getMonth());
    return Math.max(0, months) * pricePerMonth;
  } catch (e) {
    return 0;
  }
};

const getSortValue = (stock, option, originalIdx) => {
  switch (option) {
    case 'ลำดับที่': {
      const order = parseNumber(stock["ลำดับการซื้อ"]);
      return isNaN(order) || order === 0 ? originalIdx : order;
    }
    case 'มูลค่าตลาด':
      return parseNumber(stock["มูลค่าตลาด ($)"]);
    case 'ราคาหุ้น':
      return parseNumber(stock["ราคาหุ้น ($)"]);
    case 'ปันผล':
      return parseNumber(stock["อัตราปันผล (%)"]);
    case 'ราคาตั้งซื้อ':
      return parseNumber(stock["ราคาตั้งซื้อ ($)"]);
    case 'ยอดตั้งซื้อ': {
      const targetPrice = parseNumber(stock["ราคาตั้งซื้อ ($)"]);
      const targetAmount = targetPrice > 0 ? calculateTargetAmount(stock["วันที่กำหนด"], stock["ราคาตั้งซื้อ ($)"]) : 0;
      return (stock.port === 'Trade' || targetPrice <= 0)
        ? 0
        : targetAmount - parseNumber(stock["ยอดซื้อ ($)"]) + parseNumber(stock["ยอดขาย ($)"]);
    }
    case 'ยอดซื้อ':
      return parseNumber(stock["ยอดซื้อ ($)"]);
    case 'ยอดขาย':
      return parseNumber(stock["ยอดขาย ($)"]);
    case 'ยอดกำไร':
      return stock["สถานะ"] === "ขายแล้ว" || stock["สถานะ"] === "รอซื้อ"
        ? parseNumber(stock["ยอดขาย ($)"]) - parseNumber(stock["ยอดซื้อ ($)"])
        : 0;
    case 'ยอดปันผล':
      return parseNumber(stock["ยอดปันผล ($)"]);
    case 'ยอดภาษี': {
      const taxVal = stock["ภาษีปันผล ($)"] || stock["ภาษี ($)"] || stock["ยอดภาษี ($)"] || 0;
      return parseNumber(taxVal);
    }
    case 'กำไรสุทธิ': {
      const totalProfit = stock["สถานะ"] === "ขายแล้ว" || stock["สถานะ"] === "รอซื้อ"
        ? parseNumber(stock["ยอดขาย ($)"]) - parseNumber(stock["ยอดซื้อ ($)"])
        : 0;
      const taxVal = stock["ภาษีปันผล ($)"] || stock["ภาษี ($)"] || stock["ยอดภาษี ($)"] || 0;
      const clearVal = stock["ยอดกำจัด ($)"] || stock["clear_amount"] || 0;
      return totalProfit + (parseNumber(stock["ยอดปันผล ($)"]) - parseNumber(taxVal)) - parseNumber(clearVal);
    }
    default:
      return originalIdx;
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
  
  return isNegative ? `≈ -฿${formatted}` : `≈ ฿${formatted}`;
};

const maskFormattedMoney = (str) => {
  if (!str) return '';
  const firstDigitIndex = str.search(/\d/);
  if (firstDigitIndex === -1) return str;
  
  const prefix = str.slice(0, firstDigitIndex);
  const numericPart = str.slice(firstDigitIndex);
  
  const numToMask = Math.floor(numericPart.length / 2.5);
  let maskedDigitsCount = 0;
  let maskedNumericPart = '';
  for (let i = 0; i < numericPart.length; i++) {
    const char = numericPart[i];
    if (/\d/.test(char) && maskedDigitsCount < numToMask) {
      maskedNumericPart += '*';
      maskedDigitsCount++;
    } else {
      maskedNumericPart += char;
    }
  }
  
  return prefix + maskedNumericPart;
};

const sortOptions = [
  { value: "ลำดับที่", label: "ลำดับที่" },
  { value: "มูลค่าตลาด", label: "มูลค่าตลาด" },
  { value: "ราคาหุ้น", label: "ราคาหุ้น" },
  { value: "ปันผล", label: "ปันผล" },
  { value: "ราคาตั้งซื้อ", label: "ราคาตั้งซื้อ" },
  { value: "ยอดตั้งซื้อ", label: "ยอดตั้งซื้อ" },
  { value: "ยอดซื้อ", label: "ยอดซื้อ" },
  { value: "ยอดขาย", label: "ยอดขาย" },
  { value: "ยอดกำไร", label: "ยอดกำไร" },
  { value: "ยอดปันผล", label: "ยอดปันผล" },
  { value: "ยอดภาษี", label: "ยอดภาษี" },
  { value: "กำไรสุทธิ", label: "กำไรสุทธิ" },
  { value: "ซื้อล่าสุด", label: "ซื้อล่าสุด" },
  { value: "ขายล่าสุด", label: "ขายล่าสุด" },
  { value: "อายุการถือ", label: "อายุการถือ" }
];

const statusOptions = [
  { value: "ซื้อแล้ว", label: "ซื้อแล้ว" },
  { value: "ขายแล้ว", label: "ขายแล้ว" },
  { value: "รอขาย", label: "รอขาย" },
  { value: "ขายบางส่วน", label: "ขายบางส่วน" },
  { value: "รอซื้อ", label: "รอซื้อ" }
];

const sortSelectStyles = {
  control: (provided, state) => ({
    ...provided,
    backgroundColor: 'transparent',
    border: 'none',
    boxShadow: 'none',
    minHeight: 'auto',
    height: '100%',
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: '0.85rem',
    fontWeight: '700',
    color: 'var(--text-main)',
    display: 'flex',
    alignItems: 'center',
    width: '100%',
    minWidth: '100px',
  }),
  valueContainer: (provided) => ({
    ...provided,
    padding: '0 4px',
    color: 'var(--text-main)',
  }),
  singleValue: (provided) => ({
    ...provided,
    color: 'var(--text-main)',
    margin: 0,
  }),
  indicatorsContainer: (provided) => ({
    ...provided,
    height: '100%',
  }),
  dropdownIndicator: (provided, state) => ({
    ...provided,
    color: 'var(--text-muted)',
    padding: '2px',
    '&:hover': {
      color: 'var(--text-main)',
    },
    transform: state.isFocused ? 'rotate(180deg)' : 'none',
    transition: 'transform 0.2s ease',
  }),
  indicatorSeparator: () => ({
    display: 'none',
  }),
  menu: (provided) => ({
    ...provided,
    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.9) 100%)',
    backdropFilter: 'blur(24px)',
    border: '1px solid rgba(255, 255, 255, 0.5)',
    borderRadius: '0.75rem',
    boxShadow: '0 10px 30px -10px rgba(31, 38, 135, 0.15)',
    zIndex: 9999,
  }),
  menuPortal: (provided) => ({
    ...provided,
    zIndex: 9999,
  }),
  option: (provided, state) => ({
    ...provided,
    backgroundColor: state.isSelected 
      ? 'var(--primary)' 
      : state.isFocused 
        ? 'rgba(99, 102, 241, 0.08)' 
        : 'transparent',
    color: state.isSelected ? '#ffffff' : 'var(--text-main)',
    fontWeight: state.isSelected ? '700' : '600',
    fontSize: '0.85rem',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    padding: '6px 12px',
    '&:active': {
      backgroundColor: state.isSelected ? 'var(--primary)' : 'rgba(99, 102, 241, 0.15)',
    }
  }),
  input: (provided) => ({
    ...provided,
    color: 'var(--text-main)',
    margin: 0,
    padding: 0,
  }),
};

const statusSelectStyles = {
  control: (provided, state) => ({
    ...provided,
    width: '100%',
    padding: '0.125rem 0.375rem',
    borderRadius: '0.75rem',
    border: state.isFocused 
      ? '1px solid var(--primary)' 
      : '1px solid rgba(255, 255, 255, 0.8)',
    borderBottomColor: state.isFocused 
      ? 'var(--primary)' 
      : 'rgba(255, 255, 255, 0.4)',
    backgroundColor: state.isFocused 
      ? 'rgba(255, 255, 255, 0.85)' 
      : 'rgba(255, 255, 255, 0.5)',
    backdropFilter: 'blur(8px)',
    color: 'var(--text-main)',
    fontSize: '0.875rem',
    fontFamily: 'inherit',
    fontWeight: '600',
    boxShadow: state.isFocused 
      ? '0 0 0 3px rgba(99, 102, 241, 0.15), inset 0 1px 2px rgba(255, 255, 255, 0.9)' 
      : 'inset 0 1px 2px rgba(255,255,255,0.4)',
    transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
    cursor: 'pointer',
    '&:hover': {
      borderColor: state.isFocused ? 'var(--primary)' : 'rgba(255, 255, 255, 0.9)',
    }
  }),
  valueContainer: (provided) => ({
    ...provided,
    padding: '0 8px',
  }),
  singleValue: (provided) => ({
    ...provided,
    color: 'var(--text-main)',
  }),
  placeholder: (provided) => ({
    ...provided,
    color: '#94a3b8',
  }),
  dropdownIndicator: (provided, state) => ({
    ...provided,
    color: 'var(--text-muted)',
    transform: state.isFocused ? 'rotate(180deg)' : 'none',
    transition: 'transform 0.2s ease',
    '&:hover': {
      color: 'var(--text-main)',
    }
  }),
  clearIndicator: (provided) => ({
    ...provided,
    color: 'var(--text-muted)',
    '&:hover': {
      color: 'var(--error)',
    }
  }),
  indicatorSeparator: () => ({
    display: 'none',
  }),
  menu: (provided) => ({
    ...provided,
    background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(255, 255, 255, 0.9) 100%)',
    backdropFilter: 'blur(24px)',
    border: '1px solid rgba(255, 255, 255, 0.5)',
    borderRadius: '0.75rem',
    boxShadow: '0 10px 30px -10px rgba(31, 38, 135, 0.15)',
    zIndex: 9999,
  }),
  menuPortal: (provided) => ({
    ...provided,
    zIndex: 9999,
  }),
  option: (provided, state) => ({
    ...provided,
    backgroundColor: state.isSelected 
      ? 'var(--primary)' 
      : state.isFocused 
        ? 'rgba(99, 102, 241, 0.08)' 
        : 'transparent',
    color: state.isSelected ? '#ffffff' : 'var(--text-main)',
    fontWeight: state.isSelected ? '700' : '600',
    fontSize: '0.875rem',
    cursor: 'pointer',
    transition: 'all 0.15s ease',
    padding: '8px 12px',
    '&:active': {
      backgroundColor: state.isSelected ? 'var(--primary)' : 'rgba(99, 102, 241, 0.15)',
    }
  }),
  input: (provided) => ({
    ...provided,
    color: 'var(--text-main)',
  }),
};

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
  const PORT_CATEGORIES = {
    'Hold': ['Extra', 'Main', 'Second', 'Addon', 'Begin', 'DR'],
    'Trade': ['Trade'],
    'Sale': ['Sale'],
    'List': ['List']
  };

  const [activeMainTab, setActiveMainTab] = useState('Hold');
  const [activeSubTab, setActiveSubTab] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('ลำดับที่');
  const [sortOrder, setSortOrder] = useState('asc'); // 'asc' | 'desc'

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
      const dataWithIndex = json.map((item, idx) => ({ ...item, originalIndex: idx }));
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
          colorMode="financial-dark"
        />
        <SummaryCard 
          label="ยอดตั้งกำจัดทั้งหมด" 
          value={showAmounts ? formatCurrency(summary.totalTargetClearAmount) : maskFormattedMoney(formatCurrency(summary.totalTargetClearAmount))} 
          subValue={showAmounts ? formatTHB(summary.totalTargetClearAmount * exchangeRate) : maskFormattedMoney(formatTHB(summary.totalTargetClearAmount * exchangeRate))}
          icon={<i className="fa-solid fa-filter" style={{ fontSize: '18px', color: '#06b6d4' }}></i>}
          iconBgColor="rgba(6, 180, 212, 0.1)"
          delay={0.45}
          numValue={summary.totalTargetClearAmount}
          colorMode="financial-dark"
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
      <h2 className="section-title animate-fade-in" style={{ marginBottom: '0.5rem' }}>
        <span>รายการสินทรัพย์</span>
        {activeSubTab !== 'All' && (
          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--secondary)', background: 'rgba(219, 39, 119, 0.08)', padding: '0.15rem 0.5rem', borderRadius: '6px' }}>{activeSubTab}</span>
        )}
      </h2>
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

      {/* Stock List */}
      <div className="stock-list">
        {loading ? (
          <div style={{ textAlign: 'center', padding: '3rem' }}>
            <p className="text-muted">กำลังโหลดข้อมูล...</p>
          </div>
        ) : (
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

function SummaryCard({ label, value, subValue, icon, delay, numValue, colorMode = 'financial', iconBgColor }) {
  const getValueColor = () => {
    if (numValue === undefined || numValue === null) return '';
    if (colorMode === 'binary') {
      return numValue === 0 ? 'color-grey' : 'color-black';
    }
    if (colorMode === 'orange') {
      return numValue === 0 ? 'color-grey' : 'color-orange';
    }
    if (colorMode === 'financial-dark') {
      if (numValue === 0) return 'color-grey';
      if (numValue > 0) return 'color-green-dark';
      return 'color-red';
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
        <div style={{ background: iconBgColor || '#f1f5f9', padding: '4px 6px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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
    <div className={colorClass} style={{ display: 'flex', gap: '0.375rem', alignItems: 'center', position: 'relative' }}>
      {label && <span className="detail-label" style={{ fontSize: '0.7rem' }}>{label}</span>}
      <div style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }} ref={popoverRef}>
        <span 
          className="relative-time" 
          onClick={(e) => {
            e.stopPropagation();
            setShowPopover(!showPopover);
          }}
          style={{ 
            fontSize: '0.7rem', 
            fontWeight: 700, 
            cursor: 'pointer',
            padding: '0.2rem 0.6rem',
            borderRadius: '20px',
            transition: 'background 0.2s',
            userSelect: 'none',
            display: 'inline-flex',
            alignItems: 'center',
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

function StockCard({ stock, index, onUpdateClick, exchangeRate, showAmounts }) {
  const [logoError, setLogoError] = useState(false);
  const ticker = stock["ชื่อหุ้น"];
  const logoUrl = `https://assets.parqet.com/logos/symbol/${ticker}?format=png`;
  const tvMarket = (stock["ตลาด"] || '').trim().toUpperCase();
  const tvTicker = (ticker || '').trim().toUpperCase();
  const tradingViewUrl = tvMarket && tvTicker 
    ? `https://th.tradingview.com/symbols/${tvMarket}-${tvTicker}/` 
    : (stock["TradingView"] || `https://th.tradingview.com/symbols/${tvTicker}/`);

  const DetailItem = ({ label, value, isMoney = false, relativeTime = '', colorClass = '', percent = null }) => {
    const parsedValue = parseNumber(value);
    const shouldHide = !showAmounts;
    
    let displayValue = value || '-';
    if (isMoney) {
      const formatted = parsedValue < 0 
        ? `-$${Math.abs(parsedValue).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
        : `$${parsedValue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      displayValue = shouldHide ? maskFormattedMoney(formatted) : formatted;
    }

    return (
      <div className={`detail-item ${colorClass}`}>
        <span className="detail-label">{label}</span>
        <span className={`detail-value ${colorClass.startsWith('color-') ? colorClass : ''}`}>
          {displayValue}
          {relativeTime && <span className="relative-time">{relativeTime}</span>}
        </span>
        {isMoney && (
          <span 
            className={`detail-sub-value ${colorClass.startsWith('color-') ? colorClass : ''}`}
            style={{ display: 'inline-flex', alignItems: 'baseline', gap: '0.25rem', flexWrap: 'wrap' }}
          >
            <span>
              {(() => {
                const formattedSub = parsedValue * exchangeRate < 0 
                  ? `≈ -฿${Math.abs(parsedValue * exchangeRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
                  : `≈ ฿${(parsedValue * exchangeRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
                return shouldHide ? maskFormattedMoney(formattedSub) : formattedSub;
              })()}
            </span>
            {percent !== null && percent !== undefined && (
              <span style={{ fontSize: '0.65rem', fontWeight: 700, color: Math.abs(percent) < 1e-9 ? '#94a3b8' : undefined }}>
                ({percent > 0 ? '+' : ''}{percent.toFixed(2)}%)
              </span>
            )}
          </span>
        )}
      </div>
    );
  };

  const targetPrice = parseNumber(stock["ราคาตั้งซื้อ ($)"]);
  const targetAmount = targetPrice > 0 ? calculateTargetAmount(stock["วันที่กำหนด"], stock["ราคาตั้งซื้อ ($)"]) : 0;
  const remainingTarget = (stock.port === 'Trade' || targetPrice <= 0)
    ? 0
    : targetAmount - parseNumber(stock["ยอดซื้อ ($)"]) + parseNumber(stock["ยอดขาย ($)"]);
  const totalProfit = stock["สถานะ"] === "ขายแล้ว" || stock["สถานะ"] === "รอซื้อ"
    ? parseNumber(stock["ยอดขาย ($)"]) - parseNumber(stock["ยอดซื้อ ($)"])
    : 0;
  const taxVal = stock["ภาษีปันผล ($)"] || stock["ภาษี ($)"] || stock["ยอดภาษี ($)"] || 0;
  const clearAmountVal = stock["ยอดกำจัด ($)"] || stock["clear_amount"] || 0;
  const netIncome = totalProfit + (parseNumber(stock["ยอดปันผล ($)"]) - parseNumber(taxVal)) - parseNumber(clearAmountVal);

  const buyAmount = parseNumber(stock["ยอดซื้อ ($)"]);
  const dividendAmount = parseNumber(stock["ยอดปันผล ($)"]);
  const taxAmount = parseNumber(taxVal);
  const dividendNet = dividendAmount - taxAmount;
  const profitPercent = buyAmount > 0 ? (totalProfit / buyAmount) * 100 : 0;
  const grossProfit = totalProfit + dividendAmount;
  const grossProfitPercent = buyAmount > 0 ? (grossProfit / buyAmount) * 100 : 0;
  const netIncomePercent = buyAmount > 0 ? (netIncome / buyAmount) * 100 : 0;
  const dividendPercent = buyAmount > 0 ? (dividendAmount / buyAmount) * 100 : 0;
  const taxPercent = dividendAmount > 0 ? (taxAmount / dividendAmount) * 100 : 0;
  const clearPercent = dividendNet > 0 ? (parseNumber(clearAmountVal) / dividendNet) * 100 : 0;

  const clearRateVal = parseFloat(stock["อัตรากำจัด (%)"]) || parseFloat(stock["clear_rate"]) || 0;
  const rawTargetClearAmount = (dividendAmount - taxAmount) * (clearRateVal / 100) - parseNumber(clearAmountVal);
  const targetClearAmount = Math.round(rawTargetClearAmount * 100) / 100;


  const getStatusColor = (val) => {
    if (val === 0) return 'status-grey';
    if (val < 0) return 'status-red';
    return 'status-green';
  };

  const getBinaryColorClass = (val) => {
    const num = parseNumber(val);
    return num === 0 ? 'color-grey' : 'color-black';
  };

  const getGoldColorClass = (val) => {
    const num = parseNumber(val);
    return num === 0 ? 'color-grey' : 'color-gold';
  };

  const getOrangeColorClass = (val) => {
    const num = parseNumber(val);
    return num === 0 ? 'color-grey' : 'color-orange';
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
          href={tradingViewUrl}
          target="_blank"
          rel="noopener noreferrer"
          title={`ดูภาพรวม ${ticker} ใน TradingView`}
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
          <h3 style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', margin: 0 }}>
            <a 
              href={stock["TradingView"]} 
              target="_blank" 
              rel="noopener noreferrer" 
              title="ดูใน TradingView"
              style={{ textDecoration: 'none', color: 'inherit', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
              className="ticker-link hover-opacity"
            >
              <span style={{ fontWeight: 700 }}>{ticker}</span>
              <i className="fa-solid fa-arrow-up-right-from-square" style={{ fontSize: '10px', opacity: 0.65 }}></i>
            </a>
            <span className="text-muted" style={{ fontWeight: 400, fontSize: '0.85rem' }}>{stock["ชื่อบริษัท"]}</span>
            {stock["ลำดับการซื้อ"] && <span className="order-tag">ลำดับที่ {stock["ลำดับการซื้อ"]}</span>}
          </h3>
          <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <span className={`market-tag ${
              stock["ตลาด"] === 'NYSE' ? 'market-tag-nyse' :
              stock["ตลาด"] === 'NASDAQ' ? 'market-tag-nasdaq' : ''
            }`}>{stock["ตลาด"]}</span>
            {(() => {
              const typeVal = stock["ประเภท"];
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
                      <i className="fa-solid fa-arrow-up-right-from-square" style={{ fontSize: '8px', opacity: 0.65 }}></i>
                    </span>
                  </a>
                );
              }
              
              return <span className="text-muted" style={{ fontSize: '0.85rem' }}>{typeVal}</span>;
            })()}
            {stock["หลักชะรีอะฮ์"] && (
              <a 
                href={stock["Musaffa"] || '#'} 
                target="_blank" 
                rel="noopener noreferrer" 
                className={`shariah-badge shariah-${stock["หลักชะรีอะฮ์"].trim().toLowerCase().replace(/\s+/g, '-')}`}
                title="ตรวจสอบสถานะบน Musaffa"
                onClick={(e) => {
                  if (!stock["Musaffa"]) e.preventDefault();
                }}
              >
                <i className="fa-solid fa-leaf" style={{ fontSize: '10px' }}></i>
                <span>{stock["หลักชะรีอะฮ์"]}</span>
                {stock["Musaffa"] && (
                  <i className="fa-solid fa-arrow-up-right-from-square" style={{ fontSize: '8px', opacity: 0.7 }}></i>
                )}
              </a>
            )}
          </div>
        </div>

        <div className="stock-stats" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.375rem' }}>
          <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
            {(() => {
              const clearRateVal = parseFloat(stock["อัตรากำจัด (%)"]) || parseFloat(stock["clear_rate"]) || 0;
              return (
                <div 
                  className={`clear-rate-tag ${clearRateVal === 0 ? 'clear-rate-tag-zero' : ''}`}
                  style={{ 
                    background: clearRateVal === 0 ? '#f1f5f9' : '#fff7ed', 
                    color: clearRateVal === 0 ? 'var(--text-muted)' : '#ea580c', 
                    padding: '0.2rem 0.5rem', 
                    borderRadius: '20px', 
                    fontSize: '0.7rem', 
                    fontWeight: 600,
                    border: clearRateVal === 0 ? '1px solid rgba(100, 116, 139, 0.12)' : '1px solid rgba(234, 88, 12, 0.2)'
                  }}
                >
                    กำจัด {clearRateVal.toFixed(2)}%
                </div>
              );
            })()}
            {(() => {
              const dividendVal = parseFloat(stock["อัตราปันผล (%)"]) || 0;
              return (
                <div 
                  className={`dividend-tag ${dividendVal === 0 ? 'dividend-tag-zero' : ''}`} 
                  style={{ 
                    display: 'inline-block',
                    background: dividendVal === 0 ? '#f1f5f9' : '#ecfdf5',
                    color: dividendVal === 0 ? 'var(--text-muted)' : 'var(--success)',
                    border: dividendVal === 0 ? '1px solid rgba(100, 116, 139, 0.12)' : '1px solid rgba(16, 185, 129, 0.18)',
                    padding: '0.2rem 0.5rem',
                    borderRadius: '20px',
                    fontSize: '0.7rem',
                    fontWeight: 600
                  }}
                >
                  ปันผล {dividendVal.toFixed(2)}%
                </div>
              );
            })()}
          </div>
          
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.375rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            {stock["มูลค่าตลาด ($)"] && (
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.375rem' }}>
                <span className="detail-label">มูลค่าตลาด</span>
                <span style={{ color: 'var(--text-main)', fontWeight: 700, fontSize: '0.95rem' }}>
                  {formatCurrency(parseNumber(stock["มูลค่าตลาด ($)"]))}
                </span>
              </div>
            )}
            {stock["มูลค่าตลาด ($)"] && <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>•</span>}
            <span className="detail-label">ราคาหุ้น</span>
            <span className="price-value">${parseNumber(stock["ราคาหุ้น ($)"]).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>
              (≈ ฿{(parseNumber(stock["ราคาหุ้น ($)"]) * exchangeRate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })})
            </span>
          </div>
        </div>
      </div>

      <div className="stock-details-grid">
        <DetailItem label="ราคาตั้งซื้อ" value={stock["ราคาตั้งซื้อ ($)"]} isMoney={true} colorClass={getBinaryColorClass(stock["ราคาตั้งซื้อ ($)"])} />
        <DetailItem label="ยอดตั้งซื้อ" value={remainingTarget} isMoney={true} colorClass={getStatusColor(remainingTarget)} />
        <DetailItem label="ยอดตั้งกำจัด" value={targetClearAmount} isMoney={true} colorClass={getStatusColor(targetClearAmount)} />
        <DetailItem label="ยอดซื้อ" value={stock["ยอดซื้อ ($)"]} isMoney={true} colorClass={getBinaryColorClass(stock["ยอดซื้อ ($)"])} />
        <DetailItem label="ยอดขาย" value={stock["ยอดขาย ($)"]} isMoney={true} colorClass={getBinaryColorClass(stock["ยอดขาย ($)"])} />
        <DetailItem label="ยอดปันผล" value={stock["ยอดปันผล ($)"]} isMoney={true} colorClass={getStatusColor(parseNumber(stock["ยอดปันผล ($)"]))} percent={dividendPercent} />
        <DetailItem label="ยอดภาษี" value={taxVal} isMoney={true} colorClass={getOrangeColorClass(taxVal)} percent={taxPercent} />
        <DetailItem label="ยอดกำจัด" value={clearAmountVal} isMoney={true} colorClass={getOrangeColorClass(clearAmountVal)} percent={clearPercent} />
        <DetailItem label="กำไรขาย" value={totalProfit} isMoney={true} colorClass={getStatusColor(totalProfit)} percent={profitPercent} />
        <DetailItem label="กำไรรวม" value={grossProfit} isMoney={true} colorClass={getStatusColor(grossProfit)} percent={grossProfitPercent} />
        <DetailItem label="กำไรสุทธิ" value={netIncome} isMoney={true} colorClass={getStatusColor(netIncome)} percent={netIncomePercent} />
      </div>

      <div className="stock-card-footer" style={{ justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {stock["วันที่ซื้อครั้งแรก"] && (
            <InteractiveTime 
              dateStr={stock["วันที่ซื้อครั้งแรก"]}
              customDisplay={`${stock["สถานะ"] === 'ขายแล้ว' ? 'ถือรวม' : 'ถือมา'} ${getHoldingAge(stock["วันที่ซื้อครั้งแรก"], stock["วันที่ขายล่าสุด"], stock["สถานะ"])}`}
              customStyle={{ background: 'transparent', color: 'var(--text-main)', paddingLeft: '0.5rem' }}
            />
          )}
          {stock["สถานะ"] && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
              <span className="detail-label" style={{ fontSize: '0.7rem' }}>สถานะ</span>
              <span className={`status-badge ${
                stock["สถานะ"] === 'ซื้อแล้ว' ? 'status-badge-holding' : 
                stock["สถานะ"] === 'ขายแล้ว' ? 'status-badge-sold' :
                stock["สถานะ"] === 'รอขาย' ? 'status-badge-wait-sell' :
                stock["สถานะ"] === 'ขายบางส่วน' ? 'status-badge-partial' : 
                stock["สถานะ"] === 'รอซื้อ' ? 'status-badge-wait-buy' : 'status-badge-other'
              }`}>
                {stock["สถานะ"]}
              </span>
            </div>
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
          <i className="fa-solid fa-pen-to-square" style={{ fontSize: '14px' }}></i>
          อัปเดต
        </button>
      </div>
    </motion.div>
  );
}

function UpdateModal({ stock, exchangeRate = 36.5, onClose, onUpdateSuccess }) {
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
    if (cleanExpr.endsWith('+') || cleanExpr.endsWith('×') || cleanExpr.endsWith('÷') || cleanExpr.endsWith('-')) {
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
    else if (activeCalcField === 'dividendAmount') setDividendAmount(resultStr);
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
      buy_amount: getOrNull(buyAmount),
      sell_amount: getOrNull(sellAmount),
      dividend_amount: getOrNull(dividendAmount),
      tax_amount: getOrNull(taxAmount),
      clear_amount: getOrNull(clearAmount),
      dividend_rate: getOrNull(dividendRate),
      clear_rate: getOrNull(clearRate)
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
                  <h3 className="modal-title">
                    อัปเดต{' '}
                    <a 
                      href={stock["TradingView"]} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      title="คลิกเพื่อดูกราฟ"
                      style={{ textDecoration: 'none', color: 'inherit', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      className="hover-opacity"
                    >
                      <span>{stock["ชื่อหุ้น"]}</span>
                      <i className="fa-solid fa-arrow-up-right-from-square" style={{ fontSize: '10px', opacity: 0.65 }}></i>
                    </a>
                  </h3>
                  <p className="modal-subtitle">{stock["ชื่อบริษัท"]} • พอร์ต: <span className="highlight-tag">{stock.port}</span></p>
                </div>
              </div>
              
              <div style={{ marginLeft: 'auto', marginRight: '0.875rem', textAlign: 'right' }}>
                <span style={{ display: 'block', fontSize: '0.675rem', fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.025em', lineHeight: 1.2 }}>ราคาหุ้น</span>
                <span style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)', lineHeight: 1.2 }}>
                  ${(parseFloat(stock["ราคาหุ้น ($)"]) || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <button type="button" className="modal-close-btn" onClick={onClose}>
                <i className="fa-solid fa-xmark" style={{ fontSize: '18px' }}></i>
              </button>
            </div>

            <div className="modal-body">
              <div className="target-summary-ref" style={{ flexWrap: 'wrap', gap: '0.75rem 0.5rem' }}>
                <div className="target-ref-card" style={{ minWidth: '100px', flex: '1 1 0' }}>
                  <span className="target-ref-label">ราคาตั้งซื้อ</span>
                  <span className={`target-ref-value ${targetPrice === 0 ? 'text-grey' : ''}`} style={{ fontSize: '1rem' }}>${targetPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="target-summary-divider" style={{ margin: '0 0.5rem' }}></div>
                <div className="target-ref-card" style={{ minWidth: '100px', flex: '1 1 0' }}>
                  <span className="target-ref-label">ยอดตั้งซื้อ</span>
                  <span className={`target-ref-value ${remainingTarget > 0 ? 'text-green' : remainingTarget < 0 ? 'text-red' : 'text-grey'}`} style={{ fontSize: '1rem' }}>
                    ${remainingTarget.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="target-summary-divider" style={{ margin: '0 0.5rem' }}></div>
                <div className="target-ref-card" style={{ minWidth: '100px', flex: '1 1 0' }}>
                  <span className="target-ref-label">ยอดตั้งกำจัด</span>
                  <span className={`target-ref-value ${currentTargetClearAmount > 0 ? 'text-green' : currentTargetClearAmount < 0 ? 'text-red' : 'text-grey'}`} style={{ fontSize: '1rem' }}>
                    ${currentTargetClearAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="target-summary-divider" style={{ margin: '0 0.5rem' }}></div>
                <div className="target-ref-card" style={{ minWidth: '100px', flex: '1 1 0' }}>
                  <span className="target-ref-label">กำไรขาย</span>
                  <span className={`target-ref-value ${currentTotalProfit > 0 ? 'text-green' : currentTotalProfit < 0 ? 'text-red' : 'text-grey'}`} style={{ fontSize: '1rem' }}>
                    ${currentTotalProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="target-summary-divider" style={{ margin: '0 0.5rem' }}></div>
                <div className="target-ref-card" style={{ minWidth: '100px', flex: '1 1 0' }}>
                  <span className="target-ref-label">กำไรรวม</span>
                  <span className={`target-ref-value ${currentGrossProfit > 0 ? 'text-green' : currentGrossProfit < 0 ? 'text-red' : 'text-grey'}`} style={{ fontSize: '1rem' }}>
                    ${currentGrossProfit.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
                <div className="target-summary-divider" style={{ margin: '0 0.5rem' }}></div>
                <div className="target-ref-card" style={{ minWidth: '100px', flex: '1 1 0' }}>
                  <span className="target-ref-label">กำไรสุทธิ</span>
                  <span className={`target-ref-value ${currentNetIncome > 0 ? 'text-green' : currentNetIncome < 0 ? 'text-red' : 'text-grey'}`} style={{ fontSize: '1rem' }}>
                    ${currentNetIncome.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <div className="form-grid-container">
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
                      onChange={(e) => setDividendAmount(e.target.value)}
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

export default App;
