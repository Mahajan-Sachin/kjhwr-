import React, { useState, useEffect } from 'react';
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, ComposedChart
} from 'recharts';
import {
  Zap, Calendar, Clock, BarChart3, TrendingUp, AlertTriangle, ShieldCheck, RefreshCw, ArrowUpRight, ArrowDownRight, Layers, Info
} from 'lucide-react';

// Dynamic API URL: Uses relative path '/api' in production, or localhost:8000 in dev
const API_BASE_URL = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? 'http://127.0.0.1:8000' : '');

export default function App() {
  const [selectedDate, setSelectedDate] = useState('2026-01-15');
  const [resolution, setResolution] = useState('hourly'); // 'hourly' or 'half_hourly'
  const [cutoffHour, setCutoffHour] = useState(17);
  const [availableDates, setAvailableDates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [evalData, setEvalData] = useState(null);

  // Fetch available dates on load
  useEffect(() => {
    fetch(`${API_BASE_URL}/api/available-dates`)
      .then(res => res.json())
      .then(data => {
        if (data.dates) setAvailableDates(data.dates);
      })
      .catch(err => {
        console.warn('Backend not running locally or connecting to fallback dates', err);
        // Fallback January 2026 dates
        const dates = Array.from({ length: 31 }, (_, i) => `2026-01-${String(i + 1).padStart(2, '0')}`);
        setAvailableDates(dates);
      });
  }, []);

  // Fetch evaluation data when date, resolution, or cutoff changes
  useEffect(() => {
    fetchEvaluationData(selectedDate, resolution, cutoffHour);
  }, [selectedDate, resolution, cutoffHour]);

  const fetchEvaluationData = async (date, res, cutoff) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const response = await fetch(`${API_BASE_URL}/api/evaluate?date=${date}&resolution=${res}&cutoff_hour=${cutoff}`);
      const result = await response.json();
      if (result.success) {
        setEvalData(result);
      } else {
        setErrorMsg(result.message || 'Failed to fetch evaluation data.');
        setEvalData(null);
      }
    } catch (err) {
      setErrorMsg('Could not connect to Python backend at http://localhost:8000. Please ensure backend is running.');
      setEvalData(null);
    } finally {
      setLoading(false);
    }
  };

  const metrics = evalData?.metrics;
  const chartPoints = evalData?.data || [];

  // Calculate Day D-1 (Publish Date) for clear labeling
  const getPrevDate = (dateStr) => {
    try {
      const d = new Date(dateStr + 'T00:00:00Z');
      d.setUTCDate(d.getUTCDate() - 1);
      return d.toISOString().split('T')[0];
    } catch {
      return 'D-1';
    }
  };
  const prevDate = getPrevDate(selectedDate);

  return (
    <div style={{ minHeight: '100vh', padding: '24px 32px', maxWidth: '1440px', margin: '0 auto' }}>
      {/* 1. Header & Utility Branding */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
            <div style={{ background: 'linear-gradient(135deg, #2563eb, #06b6d4)', padding: '10px', borderRadius: '12px', display: 'flex', boxShadow: '0 0 20px rgba(6, 182, 212, 0.3)' }}>
              <Zap size={22} color="#ffffff" />
            </div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 800, letterSpacing: '-0.02em', background: 'linear-gradient(135deg, #ffffff, #94a3b8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              Gridbricks <span style={{ color: '#38bdf8', WebkitTextFillColor: '#38bdf8' }}>Day-Ahead</span> Wind Portal
            </h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            UK Wholesale Market Renewable Forecasting & Quantitative Accuracy Evaluation (Elexon BMRS)
          </p>
        </div>

        {/* Live Badges */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span className="badge badge-green">
            <ShieldCheck size={14} /> Elexon BMRS Live Stream
          </span>
          <span className="badge badge-blue">
            <Layers size={14} /> AI-Assisted Architecture
          </span>
        </div>
      </header>

      {/* 2. Control Toolbar: Date Picker, Resolution Toggle & Decision Cutoff */}
      <section className="glass-panel" style={{ padding: '18px 24px', marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
        {/* Delivery Date Selection (Calendar Table / Picker) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-secondary)' }}>
            <Calendar size={18} color="#38bdf8" />
            <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>Delivery Date:</span>
          </div>

          <input
            type="date"
            className="custom-date-input"
            value={selectedDate}
            onChange={(e) => {
              if (e.target.value) setSelectedDate(e.target.value);
            }}
          />

          {/* Quick preset chips */}
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              className="preset-chip"
              onClick={() => setSelectedDate('2026-01-15')}
              title="Standard January Benchmark Date"
            >
              15 Jan (Benchmark)
            </button>
            <button
              className="preset-chip"
              onClick={() => setSelectedDate('2026-01-01')}
              title="New Year Boundary Date"
            >
              01 Jan
            </button>
            <button
              className="preset-chip"
              onClick={() => setSelectedDate('2026-10-27')}
              title="Recent Live Stream Date"
            >
              27 Oct (Recent)
            </button>
          </div>
        </div>

        {/* Resolution Toggle (Hourly 24-pt vs Settlement Period 48-pt) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Resolution:</span>
          <div style={{ background: 'rgba(0, 0, 0, 0.4)', padding: '4px', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', gap: '4px' }}>
            <button
              className={`btn-toggle ${resolution === 'hourly' ? 'active' : ''}`}
              onClick={() => setResolution('hourly')}
              title="Method 1: Aggregates half-hourly actuals to hourly mean (24 points)"
            >
              Hourly (24 pts)
            </button>
            <button
              className={`btn-toggle ${resolution === 'half_hourly' ? 'active' : ''}`}
              onClick={() => setResolution('half_hourly')}
              title="Method 2: Linearly interpolates hourly forecasts into 48 settlement periods"
            >
              Settlement Periods (48 pts)
            </button>
          </div>
        </div>

        {/* Day-Ahead Decision Gate Closure Cut-off */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
            <Clock size={16} color="#fbbf24" />
            <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>D-1 Gate Closure:</span>
          </div>
          <select
            className="custom-select"
            value={cutoffHour}
            onChange={(e) => setCutoffHour(Number(e.target.value))}
          >
            <option value={11}>11:00 UTC (EPEX Spot)</option>
            <option value={12}>12:00 UTC (Noon Auction)</option>
            <option value={17}>17:00 UTC (Evening Trading)</option>
            <option value={23}>23:00 UTC (Late Day-Ahead)</option>
          </select>

          <button
            onClick={() => fetchEvaluationData(selectedDate, resolution, cutoffHour)}
            style={{ background: 'rgba(255, 255, 255, 0.05)', border: '1px solid var(--border-color)', color: 'var(--text-primary)', padding: '8px 12px', borderRadius: '10px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
            title="Refresh from API / Cache"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          </button>
        </div>
      </section>

      {/* Error Banner */}
      {errorMsg && (
        <div style={{ background: 'rgba(244, 63, 94, 0.15)', border: '1px solid rgba(244, 63, 94, 0.4)', borderRadius: '14px', padding: '16px 20px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px', color: '#fecdd3' }}>
          <AlertTriangle size={20} color="#fb7185" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* 3. Executive KPI Metric Cards (Symmetric 6-Card Grid) */}
      {metrics && (
        <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '28px' }}>
          {/* MAE */}
          <div className="glass-panel" style={{ padding: '18px 20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Mean Absolute Error (MAE)</span>
              <span className="badge badge-blue">Accuracy</span>
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em' }}>
              {metrics.mae_mw.toLocaleString()} <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>MW</span>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
              Normalized Error: <strong style={{ color: '#38bdf8' }}>{metrics.nmae_percent}%</strong>
            </div>
          </div>

          {/* RMSE */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Root Mean Sq Error (RMSE)</span>
              <span className="badge badge-amber">Volatility</span>
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#f8fafc', letterSpacing: '-0.02em' }}>
              {metrics.rmse_mw.toLocaleString()} <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>MW</span>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
              Penalizes large outlier forecast swings
            </div>
          </div>

          {/* Forecast Bias */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Forecast Bias</span>
              <span className={`badge ${metrics.bias_mw > 0 ? 'badge-amber' : 'badge-rose'}`}>
                {metrics.bias_direction}
              </span>
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: metrics.bias_mw > 0 ? '#fbbf24' : '#fb7185', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: '6px' }}>
              {metrics.bias_mw > 0 ? `+${metrics.bias_mw.toLocaleString()}` : metrics.bias_mw.toLocaleString()}
              <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>MW</span>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
              {metrics.bias_mw > 0 ? 'Surplus risk (Bought excess thermal)' : 'Shortfall risk (Imbalance cash-out penalty)'}
            </div>
          </div>

          {/* Day Energy Totals */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Total Day Generation</span>
              <span className="badge badge-green">Energy</span>
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#34d399', letterSpacing: '-0.02em' }}>
              {Math.round(metrics.total_actual_mwh / 1000).toLocaleString()} <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>GWh</span>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
              Forecast: {Math.round(metrics.total_forecast_mwh / 1000).toLocaleString()} GWh
            </div>
          </div>

          {/* R2 Score (0 to 1) */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>R² Fit Score</span>
              <span className="badge badge-blue">Scale: 0 to 1</span>
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: metrics.r2_score >= 0.7 ? '#34d399' : metrics.r2_score >= 0.4 ? '#fbbf24' : '#fb7185', letterSpacing: '-0.02em' }}>
              {metrics.r2_score !== undefined ? metrics.r2_score : 'N/A'}
              <span style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}> / 1.0</span>
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
              {metrics.r2_score >= 0.7 ? 'Strong variance explained' : 'Moderate model tracking'}
            </div>
          </div>

          {/* Pearson Correlation (r) */}
          <div className="glass-panel" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Pearson Correlation (r)</span>
              <span className="badge badge-amber">Shape Sync</span>
            </div>
            <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#38bdf8', letterSpacing: '-0.02em' }}>
              {metrics.correlation !== undefined ? (metrics.correlation > 0 ? `+${metrics.correlation}` : metrics.correlation) : 'N/A'}
            </div>
            <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '6px' }}>
              Wind ramp & trajectory synchronization
            </div>
          </div>
        </section>
      )}

      {/* 4. Main Interactive Comparison Chart */}
      <section className="glass-panel" style={{ padding: '24px', marginBottom: '28px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h2 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#f8fafc', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BarChart3 size={20} color="#38bdf8" /> Day-Ahead Forecast vs Actual Wind Generation
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              Comparing <strong>Actuals delivered on {selectedDate}</strong> against <strong>Forecasts published on {prevDate}</strong> (Resolution: {resolution === 'hourly' ? 'Hourly Aggregation (24 pts)' : 'Linear Interpolation (48 pts)'})
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px', fontSize: '0.825rem', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(16, 185, 129, 0.12)', padding: '5px 10px', borderRadius: '8px', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#10b981' }} />
              <span style={{ color: '#34d399', fontWeight: 600 }}>Actual: {selectedDate} (Delivered)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(56, 189, 248, 0.12)', padding: '5px 10px', borderRadius: '8px', border: '1px solid rgba(56, 189, 248, 0.25)' }}>
              <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#38bdf8' }} />
              <span style={{ color: '#38bdf8', fontWeight: 600 }}>Forecast: {prevDate} (Day-Ahead D-1)</span>
            </div>
          </div>
        </div>

        {/* Recharts Container */}
        <div style={{ width: '100%', height: '360px', marginBottom: '18px' }}>
          {loading ? (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)' }}>
              <RefreshCw size={24} className="animate-spin" /> Fetching and aligning Elexon data...
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartPoints} margin={{ top: 10, right: 20, left: 10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.06)" />
                <XAxis
                  dataKey="time"
                  stroke="#64748b"
                  fontSize={12}
                  tickLine={false}
                  interval={resolution === 'hourly' ? 1 : 3}
                />
                <YAxis
                  stroke="#64748b"
                  fontSize={12}
                  tickLine={false}
                  tickFormatter={(val) => `${(val / 1000).toFixed(0)}k MW`}
                />
                <Tooltip content={<CustomTooltip deliveryDate={selectedDate} publishDate={prevDate} />} />
                <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '0.85rem' }} />
                <Line
                  type="monotone"
                  dataKey="actual_mw"
                  name={`Actual Wind Delivered (${selectedDate})`}
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={{ r: 2, fill: '#10b981' }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="forecast_mw"
                  name={`Day-Ahead Forecast (Published ${prevDate})`}
                  stroke="#38bdf8"
                  strokeWidth={2.5}
                  strokeDasharray="5 5"
                  dot={{ r: 2, fill: '#38bdf8' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* 2nd Chart: Direct Spread / Imbalance Delta (Actual - Forecast) */}
        {!loading && chartPoints.length > 0 && (
          <div style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>
                Hourly Imbalance Variance (Actual - Forecast):
              </span>
              <div style={{ display: 'flex', gap: '14px', fontSize: '0.75rem' }}>
                <span style={{ color: '#34d399' }}>▲ Surplus (Actual &gt; FC)</span>
                <span style={{ color: '#fb7185' }}>▼ Shortfall (Actual &lt; FC)</span>
              </div>
            </div>
            <div style={{ width: '100%', height: '140px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartPoints} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="2 2" stroke="rgba(255, 255, 255, 0.04)" />
                  <XAxis dataKey="time" stroke="#64748b" fontSize={11} tickLine={false} interval={resolution === 'hourly' ? 2 : 5} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} tickFormatter={(val) => `${val > 0 ? '+' : ''}${(val / 1000).toFixed(1)}k`} />
                  <Tooltip content={<CustomDeltaTooltip />} />
                  <Bar
                    dataKey="error_mw"
                    name="Variance Delta (MW)"
                    shape={(props) => {
                      const { x, y, width, height, value } = props;
                      const fill = value >= 0 ? '#10b981' : '#f43f5e';
                      return <rect x={x} y={y} width={width} height={height} fill={fill} rx={2} opacity={0.85} />;
                    }}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </section>

      {/* 5. Detailed Settlement Period / Hourly Table */}
      <section className="glass-panel" style={{ padding: '24px', marginBottom: '28px' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '16px', color: '#f8fafc' }}>
          Detailed Schedule & Error Breakdown
        </h3>
        <div style={{ maxHeight: '360px', overflowY: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                <th style={{ padding: '12px 14px' }}>Time Slot</th>
                {resolution === 'half_hourly' && <th style={{ padding: '12px 14px' }}>Period</th>}
                <th style={{ padding: '12px 14px' }}>
                  <span style={{ color: '#38bdf8' }}>Forecast (MW)</span>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Published: {prevDate} (D-1)</div>
                </th>
                <th style={{ padding: '12px 14px' }}>
                  <span style={{ color: '#34d399' }}>Actual (MW)</span>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Delivered: {selectedDate}</div>
                </th>
                <th style={{ padding: '12px 14px' }}>Error (Actual - FC)</th>
                <th style={{ padding: '12px 14px' }}>Trading Risk Status</th>
              </tr>
            </thead>
            <tbody>
              {chartPoints.map((row, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.04)', background: idx % 2 === 0 ? 'transparent' : 'rgba(255, 255, 255, 0.015)' }}>
                  <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', fontWeight: 600, color: '#f8fafc' }}>
                    {row.time}
                  </td>
                  {resolution === 'half_hourly' && (
                    <td style={{ padding: '10px 14px', color: '#94a3b8' }}>
                      P{row.settlementPeriod}
                    </td>
                  )}
                  <td style={{ padding: '10px 14px', color: '#38bdf8' }}>
                    {row.forecast_mw.toLocaleString()} MW
                  </td>
                  <td style={{ padding: '10px 14px', color: '#34d399', fontWeight: 600 }}>
                    {row.actual_mw.toLocaleString()} MW
                  </td>
                  <td style={{ padding: '10px 14px', fontFamily: 'var(--font-mono)', color: row.error_mw >= 0 ? '#34d399' : '#fb7185' }}>
                    {row.error_mw > 0 ? `+${row.error_mw.toLocaleString()}` : row.error_mw.toLocaleString()} MW
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    {Math.abs(row.error_mw) < 500 ? (
                      <span className="badge badge-green">Balanced</span>
                    ) : row.error_mw > 0 ? (
                      <span className="badge badge-blue">Surplus Wind</span>
                    ) : (
                      <span className="badge badge-rose">Shortfall Risk</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 6. Technical & Methodology Explainer Card (Perfect for Video Demo Part 1 & Part 2) */}
      <footer className="glass-panel" style={{ padding: '20px 24px', background: 'rgba(15, 23, 42, 0.6)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: '#38bdf8' }}>
          <Info size={18} />
          <h4 style={{ fontSize: '0.95rem', fontWeight: 700 }}>Domain Decision Support & Methodology Notes:</h4>
        </div>
        <p style={{ fontSize: '0.825rem', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          <strong>Day-Ahead Procurement:</strong> Wholesale power trades for tomorrow must close on Day D-1 before gate closure (11:00 / 12:00 / 17:00 UTC). The trader relies on the latest available wind forecast to calculate required supplemental thermal procurement.
          <br />
          <strong>Resolution Alignment:</strong> Elexon WINDFOR forecasts are published hourly (24 points), while physical FUELHH settlement occurs in 30-minute intervals (48 periods). Toggle between <em>Method 1 (Hourly Aggregation)</em> and <em>Method 2 (Linear Interpolation)</em> to evaluate accuracy under both operational perspectives.
        </p>
      </footer>
    </div>
  );
}

// Custom Tooltip for Recharts with Explicit Dates
function CustomTooltip({ active, payload, deliveryDate, publishDate }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const isSurplus = data.error_mw >= 0;
    return (
      <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '12px', padding: '14px', boxShadow: '0 10px 25px rgba(0, 0, 0, 0.5)', minWidth: '240px' }}>
        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#f8fafc', marginBottom: '8px', borderBottom: '1px solid #1e293b', paddingBottom: '4px' }}>
          Delivery Slot: {data.time} ({deliveryDate}) {data.settlementPeriod ? `• Period ${data.settlementPeriod}` : ''}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', fontSize: '0.85rem', marginBottom: '4px' }}>
          <span style={{ color: '#94a3b8' }}>Actual ({deliveryDate}):</span>
          <strong style={{ color: '#34d399' }}>{data.actual_mw.toLocaleString()} MW</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', fontSize: '0.85rem', marginBottom: '4px' }}>
          <span style={{ color: '#94a3b8' }}>Forecast (Pub: {publishDate}):</span>
          <strong style={{ color: '#38bdf8' }}>{data.forecast_mw.toLocaleString()} MW</strong>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: '12px', fontSize: '0.85rem', marginTop: '6px', paddingTop: '6px', borderTop: '1px dashed #1e293b' }}>
          <span style={{ color: '#94a3b8' }}>Imbalance:</span>
          <strong style={{ color: isSurplus ? '#34d399' : '#fb7185' }}>
            {isSurplus ? `+${data.error_mw.toLocaleString()}` : data.error_mw.toLocaleString()} MW
          </strong>
        </div>
      </div>
    );
  }
  return null;
}

// Custom Tooltip for Variance Delta Bars
function CustomDeltaTooltip({ active, payload }) {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const isSurplus = data.error_mw >= 0;
    return (
      <div style={{ background: '#0f172a', border: '1px solid #334155', borderRadius: '10px', padding: '10px 14px', fontSize: '0.85rem', boxShadow: '0 8px 20px rgba(0, 0, 0, 0.4)' }}>
        <div style={{ fontWeight: 600, color: '#f8fafc', marginBottom: '4px' }}>
          Time: {data.time} {data.settlementPeriod ? `(P${data.settlementPeriod})` : ''}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: '#94a3b8' }}>Variance:</span>
          <strong style={{ color: isSurplus ? '#34d399' : '#fb7185' }}>
            {isSurplus ? `+${data.error_mw.toLocaleString()} MW (Surplus Wind)` : `${data.error_mw.toLocaleString()} MW (Shortfall Risk)`}
          </strong>
        </div>
      </div>
    );
  }
  return null;
}
