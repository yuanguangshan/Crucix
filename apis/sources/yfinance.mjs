// Yahoo Finance — Live market quotes (no API key required)
// Provides real-time prices for stocks, ETFs, crypto, commodities
// Replaces the need for Alpaca or any paid market data provider

import { safeFetch } from '../utils/fetch.mjs';

const BASE = 'https://query1.finance.yahoo.com/v8/finance/chart';

// Symbols to track — covers broad market, rates, commodities, crypto, volatility
const SYMBOLS = {
  // Indexes / ETFs — US
  SPY: 'S&P 500',
  QQQ: 'Nasdaq 100',
  DIA: 'Dow Jones',
  IWM: 'Russell 2000',
  // Indexes — Europe
  '^FTSE': 'FTSE 100',
  '^GDAXI': 'DAX',
  '^FCHI': 'CAC 40',
  '^STOXX': 'STOXX 600',
  // Indexes — Asia-Pacific
  '^N225': 'Nikkei 225',
  '^HSI': 'Hang Seng',
  '000001.SS': 'Shanghai',
  '^KS11': 'KOSPI',
  '^AXJO': 'S&P/ASX 200',
  '^BSESN': 'Sensex',
  // Indexes — Americas
  '^GSPTSE': 'TSX',
  '^BVSP': 'Bovespa',
  // Rates / Credit
  TLT: '20Y+ Treasury',
  HYG: 'High Yield Corp',
  LQD: 'IG Corporate',
  // Commodities
  'GC=F': 'Gold',
  'SI=F': 'Silver',
  'HG=F': 'Copper',
  'PL=F': 'Platinum',
  'PA=F': 'Palladium',
  'CL=F': 'WTI Crude',
  'BZ=F': 'Brent Crude',
  'NG=F': 'Natural Gas',
  'HO=F': 'Heating Oil',
  'RB=F': 'RBOB Gasoline',
  'ZC=F': 'Corn',
  'ZW=F': 'Wheat',
  'ZS=F': 'Soybeans',
  'KC=F': 'Coffee',
  'SB=F': 'Sugar',
  'CC=F': 'Cocoa',
  'CT=F': 'Cotton',
  'LC=F': 'Live Cattle',
  'LH=F': 'Lean Hogs',
  'FC=F': 'Feeder Cattle',
  'OJ=F': 'Orange Juice',
  'RR=F': 'Rough Rice',
  // Crypto
  'BTC-USD': 'Bitcoin',
  'ETH-USD': 'Ethereum',
  // Volatility
  '^VIX': 'VIX',
};

async function fetchQuote(symbol) {
  try {
    const url = `${BASE}/${encodeURIComponent(symbol)}?range=5d&interval=1d&includePrePost=false`;
    const data = await safeFetch(url, {
      timeout: 8000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    const result = data?.chart?.result?.[0];
    if (!result) return null;

    const meta = result.meta || {};
    const quotes = result.indicators?.quote?.[0] || {};
    const closes = quotes.close || [];
    const timestamps = result.timestamp || [];

    // Get current price and previous close
    const price = meta.regularMarketPrice ?? closes[closes.length - 1];
    const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? closes[closes.length - 2];
    const change = price && prevClose ? price - prevClose : 0;
    const changePct = prevClose ? (change / prevClose) * 100 : 0;

    // Build 5-day history
    const history = [];
    for (let i = 0; i < timestamps.length; i++) {
      if (closes[i] != null) {
        history.push({
          date: new Date(timestamps[i] * 1000).toISOString().split('T')[0],
          close: Math.round(closes[i] * 100) / 100,
        });
      }
    }

    return {
      symbol,
      name: SYMBOLS[symbol] || meta.shortName || symbol,
      price: Math.round(price * 100) / 100,
      prevClose: Math.round((prevClose || 0) * 100) / 100,
      change: Math.round(change * 100) / 100,
      changePct: Math.round(changePct * 100) / 100,
      currency: meta.currency || 'USD',
      exchange: meta.exchangeName || '',
      marketState: meta.marketState || 'UNKNOWN',
      history,
    };
  } catch (e) {
    return { symbol, name: SYMBOLS[symbol] || symbol, error: e.message };
  }
}

export async function briefing() {
  return collect();
}

export async function collect() {
  const symbols = Object.keys(SYMBOLS);
  const results = await Promise.allSettled(
    symbols.map(s => fetchQuote(s))
  );

  const quotes = {};
  let ok = 0;
  let failed = 0;

  for (const r of results) {
    const q = r.status === 'fulfilled' ? r.value : null;
    if (q && !q.error) {
      quotes[q.symbol] = q;
      ok++;
    } else {
      failed++;
      const sym = q?.symbol || 'unknown';
      quotes[sym] = q || { symbol: sym, error: 'fetch failed' };
    }
  }

  // Categorize for easy dashboard consumption
  const allIndexes = pickGroup(quotes, [
    'SPY', 'QQQ', 'DIA', 'IWM',
    '^FTSE', '^GDAXI', '^FCHI', '^STOXX',
    '^N225', '^HSI', '000001.SS', '^KS11', '^AXJO', '^BSESN',
    '^GSPTSE', '^BVSP'
  ]);
  const allCommodities = pickGroup(quotes, [
    'GC=F', 'SI=F', 'HG=F', 'PL=F', 'PA=F',
    'CL=F', 'BZ=F', 'NG=F', 'HO=F', 'RB=F',
    'ZC=F', 'ZW=F', 'ZS=F', 'KC=F', 'SB=F', 'CC=F', 'CT=F',
    'LC=F', 'LH=F', 'FC=F', 'OJ=F', 'RR=F'
  ]);

  return {
    quotes,
    summary: {
      totalSymbols: symbols.length,
      ok,
      failed,
      timestamp: new Date().toISOString(),
    },
    // Limited display (6 items max per category)
    indexes: pickGroupLimit(quotes, [
      'SPY', 'QQQ', 'DIA', 'IWM',
      '^FTSE', '^GDAXI', '^FCHI', '^STOXX',
      '^N225', '^HSI', '000001.SS', '^KS11', '^AXJO', '^BSESN',
      '^GSPTSE', '^BVSP'
    ]),
    rates: pickGroup(quotes, ['TLT', 'HYG', 'LQD']),
    commodities: pickGroupLimit(quotes, [
      'GC=F', 'SI=F', 'HG=F', 'PL=F', 'PA=F',
      'CL=F', 'BZ=F', 'NG=F', 'HO=F', 'RB=F',
      'ZC=F', 'ZW=F', 'ZS=F', 'KC=F', 'SB=F', 'CC=F', 'CT=F',
      'LC=F', 'LH=F', 'FC=F', 'OJ=F', 'RR=F'
    ]),
    crypto: pickGroup(quotes, ['BTC-USD', 'ETH-USD']),
    volatility: pickGroup(quotes, ['^VIX']),
    // Full data for expansion
    all: {
      indexes: allIndexes,
      commodities: allCommodities,
    },
  };
}

function pickGroup(quotes, symbols) {
  return symbols.map(s => quotes[s]).filter(Boolean);
}

// Pick first N items for default display
function pickGroupLimit(quotes, symbols, limit = 6) {
  return pickGroup(quotes, symbols).slice(0, limit);
}
