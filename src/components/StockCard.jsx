import React, { useState } from 'react';
import { motion } from 'framer-motion';
import InteractiveTime from './InteractiveTime';
import { parseNumber, formatCurrency, maskFormattedMoney, calculateTargetAmount, parsePercentChange } from '../utils/numberUtils';
import { getHoldingAge, getTimeColor } from '../utils/dateUtils';

export default function StockCard({ stock, index, onUpdateClick, exchangeRate, showAmounts }) {
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

    const iconMap = {
      'ราคาตั้งซื้อ': <i className="fa-solid fa-bullseye" style={{ color: '#3b82f6', fontSize: '0.75rem' }}></i>,
      'ยอดตั้งซื้อ': <i className="fa-solid fa-bars-progress" style={{ color: '#f59e0b', fontSize: '0.75rem' }}></i>,
      'ยอดตั้งกำจัด': <i className="fa-solid fa-filter" style={{ color: '#06b6d4', fontSize: '0.75rem' }}></i>,
      'ยอดซื้อ': <i className="fa-solid fa-cart-shopping" style={{ color: '#6366f1', fontSize: '0.75rem' }}></i>,
      'ยอดขาย': <i className="fa-solid fa-hand-holding-dollar" style={{ color: '#10b981', fontSize: '0.75rem' }}></i>,
      'ยอดปันผล': <i className="fa-solid fa-coins" style={{ color: '#eab308', fontSize: '0.75rem' }}></i>,
      'ยอดภาษี': <i className="fa-solid fa-file-invoice-dollar" style={{ color: '#f43f5e', fontSize: '0.75rem' }}></i>,
      'ยอดกำจัด': <i className="fa-solid fa-scissors" style={{ color: '#f97316', fontSize: '0.75rem' }}></i>,
      'กำไรขาย': <i className="fa-solid fa-arrow-trend-up" style={{ color: '#14b8a6', fontSize: '0.75rem' }}></i>,
      'กำไรรวม': <i className="fa-solid fa-chart-line" style={{ color: '#059669', fontSize: '0.75rem' }}></i>,
      'กำไรสุทธิ': <i className="fa-solid fa-wallet" style={{ color: '#ec4899', fontSize: '0.75rem' }}></i>
    };

    return (
      <div className={`detail-item ${colorClass}`}>
        <span className="detail-label" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
          <span>{label}</span>
          {iconMap[label]}
        </span>
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
    if (num < 0) return 'color-red';
    return num === 0 ? 'color-grey' : 'color-black';
  };

  const getGoldColorClass = (val) => {
    const num = parseNumber(val);
    if (num < 0) return 'color-red';
    return num === 0 ? 'color-grey' : 'color-gold';
  };

  const getOrangeColorClass = (val) => {
    const num = parseNumber(val);
    if (num < 0) return 'color-red';
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
              </a>
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
                    padding: '0.2rem 0.6rem', 
                    borderRadius: '20px', 
                    fontSize: '0.7rem', 
                    fontWeight: 700,
                    border: clearRateVal === 0 ? '1px solid rgba(100, 116, 139, 0.12)' : '1px solid rgba(234, 88, 12, 0.2)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem'
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
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    background: dividendVal === 0 ? '#f1f5f9' : '#ecfdf5',
                    color: dividendVal === 0 ? 'var(--text-muted)' : 'var(--success)',
                    border: dividendVal === 0 ? '1px solid rgba(100, 116, 139, 0.12)' : '1px solid rgba(16, 185, 129, 0.18)',
                    padding: '0.2rem 0.6rem',
                    borderRadius: '20px',
                    fontSize: '0.7rem',
                    fontWeight: 700
                  }}
                >
                  ปันผล {dividendVal.toFixed(2)}%
                </div>
              );
            })()}
          </div>
          
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.375rem', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
            {stock["มูลค่าตลาด ($)"] && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
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
            {(() => {
              const changeVal = parsePercentChange(
                stock["เปลี่ยนแปลง (%)"] || 
                stock["changePercent"] || 
                stock["เปลี่ยนแปลงราคา (%)"] || 
                stock["เปอร์เซ็นต์การเปลี่ยนแปลง"] ||
                stock["% เปลี่ยนแปลง"]
              );
              if (changeVal === null) return null;
              const isPositive = changeVal > 0;
              const isNegative = changeVal < 0;
              const icon = isPositive ? 'fa-caret-up' : isNegative ? 'fa-caret-down' : '';
              return (
                <span 
                  className={`price-change-badge ${isPositive ? 'positive' : isNegative ? 'negative' : 'neutral'}`}
                  style={{ marginLeft: '0.375rem' }}
                  title="เปอร์เซ็นต์การเปลี่ยนแปลงวันนี้"
                >
                  {icon && <i className={`fa-solid ${icon}`} style={{ fontSize: '0.7rem' }}></i>}
                  {isPositive ? '+' : ''}{changeVal.toFixed(2)}%
                </span>
              );
            })()}
          </div>
        </div>
      </div>

      <div className="stock-details-grid">
        <DetailItem label="ราคาตั้งซื้อ" value={stock["ราคาตั้งซื้อ ($)"]} isMoney={true} colorClass={getBinaryColorClass(stock["ราคาตั้งซื้อ ($)"])} />
        <DetailItem label="ยอดตั้งซื้อ" value={remainingTarget} isMoney={true} colorClass={getBinaryColorClass(remainingTarget)} />
        <DetailItem label="ยอดตั้งกำจัด" value={targetClearAmount} isMoney={true} colorClass={getBinaryColorClass(targetClearAmount)} />
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
          {stock["วันที่ปันผลล่าสุด"] && (
            <InteractiveTime 
              label="ปันผลล่าสุด" 
              dateStr={stock["วันที่ปันผลล่าสุด"]} 
              colorClass={getTimeColor(stock["วันที่ปันผลล่าสุด"])} 
            />
          )}
          {(stock["วันที่กำจัดล่าสุด"] || stock["last_clear_date"]) && (
            <InteractiveTime 
              label="กำจัดล่าสุด" 
              dateStr={stock["วันที่กำจัดล่าสุด"] || stock["last_clear_date"]} 
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
