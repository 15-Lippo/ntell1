import { getCryptoSignals, getCryptoHistoricalData, getCryptoFullHistoricalData } from './crypto-signals.js';

const API_BASE_URL = 'https://api.coingecko.com/api/v3';

// Cache per i dati e i grafici
const dataCache = {
    signals: null,
    signalsFetchTime: 0,
    charts: {}
};

// Configurazione
const CONFIG = {
    cacheExpiry: 60000, // 1 minuto di cache
    mobileOptimization: true, // Ottimizzazione per mobile
    lightCharts: true // Grafici leggeri
};

async function fetchTopCryptos() {
    try {
        const response = await fetch(`${API_BASE_URL}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&sparkline=false`);
        const cryptos = await response.json();
        return cryptos.map(crypto => ({
            id: crypto.id,
            symbol: crypto.symbol.toUpperCase(),
            name: crypto.name,
            price: crypto.current_price,
            priceChange24h: crypto.price_change_percentage_24h,
            marketCap: crypto.market_cap
        }));
    } catch (error) {
        console.error('Error fetching top cryptos:', error);
        return [];
    }
}

function renderTopCryptos(cryptos) {
    const container = document.getElementById('topCryptosContainer');
    container.innerHTML = cryptos.map(crypto => `
        <div class="col-12 mb-2">
            <div class="crypto-card p-3 d-flex justify-content-between align-items-center" data-symbol="${crypto.symbol}">
                <div>
                    <h5 class="mb-1">${crypto.name} (${crypto.symbol})</h5>
                    <small class="text-muted">Market Cap: $${(crypto.marketCap / 1_000_000).toFixed(2)}M</small>
                </div>
                <div class="text-end">
                    <h6 class="mb-1">$${crypto.price.toFixed(2)}</h6>
                    <small class="${crypto.priceChange24h > 0 ? 'text-success' : 'text-danger'}">
                        ${crypto.priceChange24h.toFixed(2)}%
                    </small>
                </div>
            </div>
        </div>
    `).join('');

    // Add chart modal trigger
    document.querySelectorAll('.crypto-card').forEach(card => {
        card.addEventListener('click', async () => {
            const symbol = card.dataset.symbol;
            await showCryptoChart(symbol);
        });
    });
}

async function showCryptoChart(symbol) {
    try {
        const chartData = await getCryptoHistoricalData(symbol);
        
        const chartCtx = document.getElementById('cryptoChart');
        const cryptoChartTitle = document.getElementById('cryptoChartTitle');
        cryptoChartTitle.textContent = `${symbol} Price Chart`;

        // Destroy existing chart if it exists
        if (window.cryptoChart) {
            window.cryptoChart.destroy();
        }

        window.cryptoChart = new Chart(chartCtx, {
            type: 'line',
            data: chartData,
            options: {
                responsive: true,
                scales: {
                    y: {
                        beginAtZero: false,
                        ticks: {
                            color: '#00ff00'
                        }
                    },
                    x: {
                        ticks: {
                            color: '#00ff00'
                        }
                    }
                },
                plugins: {
                    legend: {
                        labels: {
                            color: '#00ff00'
                        }
                    }
                }
            }
        });

        // Show modal
        const chartModal = new bootstrap.Modal(document.getElementById('cryptoChartModal'));
        chartModal.show();
    } catch (error) {
        console.error('Error showing crypto chart:', error);
    }
}

function renderCryptoSignals(signals) {
    const container = document.getElementById('cryptoSignalsContainer');
    
    if (!signals || signals.length === 0) {
        container.innerHTML = `
            <div class="crypto-card p-3 mb-2">
                <p class="text-center">Nessun segnale disponibile al momento. Prova a ricaricare la pagina.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = signals.map(signal => `
        <div class="crypto-card p-3 mb-2">
            <div class="d-flex justify-content-between align-items-center mb-2">
                <h5 class="mb-0">${signal.pair}</h5>
                <span class="signal-badge ${
                    signal.signalType === 'BUY' ? 'bg-success text-white' : 
                    signal.signalType === 'SELL' ? 'bg-danger text-white' : 'bg-secondary text-white'
                }">
                    ${signal.signalType}
                </span>
            </div>
            <div class="d-flex justify-content-between">
                <div class="confidence-meter">
                    <small class="text-muted">Affidabilità</small>
                    <div class="progress" style="height: 8px;">
                        <div class="progress-bar ${signal.confidence > 85 ? 'bg-success' : signal.confidence > 70 ? 'bg-warning' : 'bg-danger'}" 
                            role="progressbar" style="width: ${signal.confidence}%;" 
                            aria-valuenow="${signal.confidence}" aria-valuemin="0" aria-valuemax="100">
                        </div>
                    </div>
                    <small>${signal.confidence}%</small>
                </div>
                <div>
                    <small class="text-muted">Pattern</small>
                    <p class="mb-0 badge bg-info">${signal.indicators?.patternDetected || 'Nessuno'}</p>
                </div>
            </div>
            <div class="row mt-2">
                <div class="col-6">
                    <small class="text-muted">Entry Price</small>
                    <p class="mb-0">$${signal.entryPrice}</p>
                </div>
                <div class="col-6 text-end">
                    <small class="text-muted">24h Change</small>
                    <p class="mb-0 ${signal.priceChange24h > 0 ? 'text-success' : 'text-danger'}">
                        ${signal.priceChange24h}%
                    </p>
                </div>
            </div>
            <div class="row mt-2">
                <div class="col-4">
                    <small class="text-muted">Target</small>
                    <p class="mb-0">$${signal.targetPrice}</p>
                </div>
                <div class="col-4">
                    <small class="text-muted">Stop Loss</small>
                    <p class="mb-0">$${signal.stopLoss}</p>
                </div>
                <div class="col-4 text-end">
                    <small class="text-muted">Gain %</small>
                    <p class="mb-0 ${signal.potentialGain > 0 ? 'text-success' : 'text-danger'}">
                        ${signal.potentialGain}%
                    </p>
                </div>
            </div>
            <div class="row mt-2">
                <div class="col-4">
                    <small class="text-muted">RSI</small>
                    <p class="mb-0 ${signal.indicators?.rsi > 70 ? 'text-danger' : signal.indicators?.rsi < 30 ? 'text-success' : 'text-warning'}">
                        ${signal.indicators?.rsi || 'N/A'}
                    </p>
                </div>
                <div class="col-4">
                    <small class="text-muted">MACD</small>
                    <p class="mb-0 ${parseFloat(signal.indicators?.macd) > 0 ? 'text-success' : 'text-danger'}">
                        ${signal.indicators?.macd || 'N/A'}
                    </p>
                </div>
                <div class="col-4">
                    <small class="text-muted">Trend</small>
                    <p class="mb-0 ${parseFloat(signal.indicators?.trendStrength) > 0 ? 'text-success' : 'text-danger'}">
                        ${signal.indicators?.trendStrength || 'N/A'}
                    </p>
                </div>
            </div>
            <div class="row mt-2">
                <div class="col-6">
                    <small class="text-muted">Support</small>
                    <p class="mb-0 text-info">${signal.support[0]}</p>
                </div>
                <div class="col-6 text-end">
                    <small class="text-muted">Resistance</small>
                    <p class="mb-0 text-warning">${signal.resistance[0]}</p>
                </div>
            </div>
        </div>
    `).join('');
}

async function renderCryptoCharts(signals) {
    const container = document.getElementById('portfolioSection');
    
    // Titolo e introduzione
    container.innerHTML = `
        <div class="crypto-card p-3 mb-3">
            <h4>Analisi Tecnica Avanzata</h4>
            <p class="small text-muted">I grafici mostrano analisi con Fibonacci, Gann, FVG (Fair Value Gap), Supply/Demand e pattern armonici per identificare con precisione inversioni e continuazioni di trend.</p>
        </div>
    `;
    
    // Render dei segnali
    signals.forEach(signal => {
        const advancedClass = signal.indicators?.advancedDetails ? 'has-advanced-data' : '';
        const patternClass = getPatternClass(signal.indicators?.patternDetected);
        
        // Estrai dettagli avanzati se disponibili
        const advDetails = signal.indicators?.advancedDetails || {};
        const hasSupplyDemand = advDetails.supplyDemand && 
                              (advDetails.supplyDemand.supplyZones?.length || 
                               advDetails.supplyDemand.demandZones?.length);
        
        const hasFibonacci = advDetails.fibonacciLevels && Object.keys(advDetails.fibonacciLevels).length > 0;
        const hasFVG = advDetails.fvgZones && (advDetails.fvgZones.bullish > 0 || advDetails.fvgZones.bearish > 0);
        const hasHarmonicPatterns = advDetails.harmonicPatterns && advDetails.harmonicPatterns.length > 0;
        
        const cardHtml = `
            <div class="crypto-chart-card p-3 mb-3 ${advancedClass} ${patternClass}" data-symbol="${signal.id}">
                <div class="d-flex justify-content-between align-items-center mb-2">
                    <h5 class="mb-0">${signal.pair}</h5>
                    <span class="signal-badge ${
                        signal.signalType === 'BUY' ? 'bg-success text-white' : 
                        signal.signalType === 'SELL' ? 'bg-danger text-white' : 'bg-secondary text-white'
                    }">
                        ${signal.signalType}
                    </span>
                </div>
                
                <div class="d-flex justify-content-between mb-2">
                    <div class="confidence-meter" style="width: 70%;">
                        <div class="d-flex justify-content-between">
                            <small class="text-muted">Affidabilità del segnale</small>
                            <small>${signal.confidence}%</small>
                        </div>
                        <div class="progress" style="height: 8px;">
                            <div class="progress-bar ${signal.confidence > 85 ? 'bg-success' : signal.confidence > 70 ? 'bg-warning' : 'bg-danger'}" 
                                role="progressbar" style="width: ${signal.confidence}%;" 
                                aria-valuenow="${signal.confidence}" aria-valuemin="0" aria-valuemax="100">
                            </div>
                        </div>
                    </div>
                    <div>
                        <small class="text-muted">Pattern</small>
                        <p class="mb-0 badge ${patternClass}">${formatPatternName(signal.indicators?.patternDetected) || 'Nessuno'}</p>
                    </div>
                </div>
                
                <div class="row mb-2">
                    <div class="col-4">
                        <small class="text-muted">Entry</small>
                        <p class="mb-0">$${signal.entryPrice}</p>
                    </div>
                    <div class="col-4">
                        <small class="text-muted">Target</small>
                        <p class="mb-0 text-success">$${signal.targetPrice}</p>
                    </div>
                    <div class="col-4">
                        <small class="text-muted">Stop Loss</small>
                        <p class="mb-0 text-danger">$${signal.stopLoss}</p>
                    </div>
                </div>
                
                ${hasSupplyDemand ? `
                <div class="small advanced-indicators mb-1">
                    <span class="text-success">D: ${advDetails.supplyDemand.demandZones?.join(', ') || 'N/A'}</span>
                    <span class="text-danger ms-2">S: ${advDetails.supplyDemand.supplyZones?.join(', ') || 'N/A'}</span>
                </div>` : ''}
                
                ${hasFVG ? `
                <div class="small advanced-indicators mb-1">
                    <span>FVG: ${advDetails.fvgZones.bullish > 0 ? 
                        `<span class="text-success">Bull(${advDetails.fvgZones.bullish})</span>` : ''}
                        ${advDetails.fvgZones.bearish > 0 ? 
                        `<span class="text-danger">Bear(${advDetails.fvgZones.bearish})</span>` : ''}
                    </span>
                </div>` : ''}
                
                <div class="chart-container" style="position: relative; height: 250px;">
                    <canvas id="chart-${signal.id}" class="crypto-full-chart"></canvas>
                </div>
                
                <div class="row mt-2">
                    <div class="col-6">
                        <div class="d-flex justify-content-between">
                            <small class="text-muted">Support</small>
                        </div>
                        <div>
                            ${signal.support.map(level => `<span class="badge bg-info me-1">$${level}</span>`).join('')}
                        </div>
                    </div>
                    <div class="col-6">
                        <div class="d-flex justify-content-between">
                            <small class="text-muted">Resistance</small>
                        </div>
                        <div>
                            ${signal.resistance.map(level => `<span class="badge bg-warning me-1">$${level}</span>`).join('')}
                        </div>
                    </div>
                </div>
                
                <div class="row mt-2">
                    <div class="col-12">
                        <small class="text-muted">Indicatori tecnici</small>
                        <div class="d-flex justify-content-between flex-wrap">
                            <span class="badge ${signal.indicators?.rsi > 70 ? 'bg-danger' : signal.indicators?.rsi < 30 ? 'bg-success' : 'bg-secondary'}">
                                RSI: ${signal.indicators?.rsi || 'N/A'}
                            </span>
                            <span class="badge ${parseFloat(signal.indicators?.macd) > 0 ? 'bg-success' : 'bg-danger'}">
                                MACD: ${signal.indicators?.macd || 'N/A'}
                            </span>
                            <span class="badge ${parseFloat(signal.indicators?.trendStrength) > 0 ? 'bg-success' : 'bg-danger'}">
                                Trend: ${signal.indicators?.trendStrength || 'N/A'}
                            </span>
                            <span class="badge bg-info">
                                R/R: ${signal.riskReward}
                            </span>
                        </div>
                    </div>
                </div>
                
                ${hasHarmonicPatterns ? `
                <div class="mt-2 small">
                    <small class="text-muted">Pattern armonici:</small> 
                    <span class="text-info">${advDetails.harmonicPatterns}</span>
                </div>` : ''}
                
                ${hasFibonacci && false ? `
                <div class="mt-2 small">
                    <small class="text-muted">Livelli Fibonacci:</small>
                    <div class="d-flex flex-wrap">
                        ${Object.entries(advDetails.fibonacciLevels || {})
                            .map(([level, value]) => 
                                `<span class="badge bg-secondary me-1">${level.replace('level', '')}: $${parseFloat(value).toFixed(2)}</span>`
                            ).join('')}
                    </div>
                </div>` : ''}
            </div>
        `;
        
        container.innerHTML += cardHtml;
    });

    // Render advanced charts for each signal
    signals.forEach(async (signal) => {
        const chartCtx = document.getElementById(`chart-${signal.id}`);
        
        try {
            // Get or fetch data
            if (!dataCache.charts[signal.id]) {
                dataCache.charts[signal.id] = await getCryptoFullHistoricalData(signal.id);
            }
            
            const fullData = dataCache.charts[signal.id];
            if (!fullData || !chartCtx) return;
            
            // Ottimizzazione per mobile
            const isMobile = window.innerWidth < 768;
            const useSimpleChart = CONFIG.lightCharts || isMobile;
            
            // Prepara dataset avanzati
            const datasets = [
                {
                    label: 'Prezzo',
                    data: fullData.prices,
                    borderColor: 'rgb(0, 255, 0)',
                    backgroundColor: 'rgba(0, 255, 0, 0.1)',
                    tension: 0.3,
                    pointRadius: useSimpleChart ? 0 : 1,
                    borderWidth: 2,
                    zIndex: 10
                }
            ];
            
            // Se non è mobile, aggiungi indicatori avanzati
            if (!useSimpleChart) {
                datasets.push(
                    {
                        label: 'SMA 20',
                        data: fullData.indicators.sma20,
                        borderColor: 'rgb(255, 99, 132)',
                        borderDash: [5, 5],
                        tension: 0.3,
                        pointRadius: 0,
                        borderWidth: 1
                    },
                    {
                        label: 'SMA 50',
                        data: fullData.indicators.bollinger.middle,
                        borderColor: 'rgb(54, 162, 235)',
                        borderDash: [5, 5],
                        tension: 0.3,
                        pointRadius: 0,
                        borderWidth: 1
                    },
                    {
                        label: 'BB Upper',
                        data: fullData.indicators.bollinger.upper,
                        borderColor: 'rgba(255, 206, 86, 0.5)',
                        borderDash: [2, 2],
                        tension: 0.3,
                        pointRadius: 0,
                        borderWidth: 1
                    },
                    {
                        label: 'BB Lower',
                        data: fullData.indicators.bollinger.lower,
                        borderColor: 'rgba(255, 206, 86, 0.5)',
                        borderDash: [2, 2],
                        tension: 0.3,
                        pointRadius: 0,
                        borderWidth: 1
                    }
                );
            }
            
            // Prepara annotazioni
            const annotations = {
                entryLine: {
                    type: 'line',
                    yMin: parseFloat(signal.entryPrice),
                    yMax: parseFloat(signal.entryPrice),
                    borderColor: 'white',
                    borderWidth: 1,
                    borderDash: [5, 5],
                    label: useSimpleChart ? { enabled: false } : {
                        content: 'Entry',
                        enabled: true,
                        position: 'right'
                    }
                },
                targetLine: {
                    type: 'line',
                    yMin: parseFloat(signal.targetPrice),
                    yMax: parseFloat(signal.targetPrice),
                    borderColor: 'green',
                    borderWidth: 1,
                    borderDash: [5, 5],
                    label: useSimpleChart ? { enabled: false } : {
                        content: 'Target',
                        enabled: true,
                        position: 'right'
                    }
                },
                stopLossLine: {
                    type: 'line',
                    yMin: parseFloat(signal.stopLoss),
                    yMax: parseFloat(signal.stopLoss),
                    borderColor: 'red',
                    borderWidth: 1,
                    borderDash: [5, 5],
                    label: useSimpleChart ? { enabled: false } : {
                        content: 'Stop',
                        enabled: true,
                        position: 'right'
                    }
                }
            };
            
            // Aggiungi supporti e resistenze come box annotation se disponibili
            if (signal.support && signal.support.length > 0) {
                annotations.supportZone = {
                    type: 'box',
                    yMin: parseFloat(signal.support[0]) * 0.98,
                    yMax: parseFloat(signal.support[0]) * 1.02,
                    backgroundColor: 'rgba(0, 255, 0, 0.1)',
                    borderColor: 'rgba(0, 255, 0, 0.2)'
                };
            }
            
            if (signal.resistance && signal.resistance.length > 0) {
                annotations.resistanceZone = {
                    type: 'box',
                    yMin: parseFloat(signal.resistance[0]) * 0.98,
                    yMax: parseFloat(signal.resistance[0]) * 1.02,
                    backgroundColor: 'rgba(255, 0, 0, 0.1)',
                    borderColor: 'rgba(255, 0, 0, 0.2)'
                };
            }
            
            // Crea il grafico
            try {
                new Chart(chartCtx, {
                    type: 'line',
                    data: {
                        labels: fullData.prices.map((_, i) => i),
                        datasets: datasets
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        animation: false,
                        elements: {
                            line: {
                                tension: 0.4
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: false,
                                grid: {
                                    color: 'rgba(0, 255, 0, 0.1)',
                                    display: !useSimpleChart
                                },
                                ticks: {
                                    color: '#00ff00',
                                    maxTicksLimit: useSimpleChart ? 4 : 6,
                                    callback: function(value) {
                                        return '$' + value.toFixed(2);
                                    }
                                }
                            },
                            x: {
                                grid: {
                                    color: 'rgba(0, 255, 0, 0.1)',
                                    display: !useSimpleChart
                                },
                                ticks: {
                                    color: '#00ff00',
                                    maxRotation: 0,
                                    maxTicksLimit: useSimpleChart ? 4 : 8,
                                    display: !useSimpleChart
                                }
                            }
                        },
                        plugins: {
                            legend: {
                                display: !useSimpleChart,
                                labels: {
                                    color: '#00ff00',
                                    boxWidth: 15,
                                    font: {
                                        size: 10
                                    }
                                }
                            },
                            annotation: {
                                annotations: annotations
                            }
                        }
                    }
                });
            } catch (error) {
                console.error(`Errore durante la creazione del grafico per ${signal.id}:`, error);
            }
        } catch (error) {
            console.error(`Errore nel caricamento dati per ${signal.id}:`, error);
        }
    });
}

function getPatternClass(pattern) {
    if (!pattern || pattern === 'NESSUNO') return 'bg-secondary';
    
    if (pattern.includes('BULLISH') || pattern.includes('BULL') || pattern.includes('DEMAND') || 
        pattern.includes('GARTLEY') || pattern.includes('BAT') || pattern.includes('BUTTERFLY') ||
        pattern.includes('FIB_LEVEL')) {
        return 'bg-success';
    }
    
    if (pattern.includes('BEARISH') || pattern.includes('BEAR') || pattern.includes('SUPPLY') ||
        pattern.includes('CRAB') || pattern.includes('SHARK')) {
        return 'bg-danger';
    }
    
    if (pattern.includes('BREAK') || pattern.includes('FVG')) {
        return 'bg-warning';
    }
    
    return 'bg-info';
}

function formatPatternName(pattern) {
    if (!pattern || pattern === 'NESSUNO') return 'Nessuno';
    
    // Mappatura dei pattern per renderli leggibili
    const patternMap = {
        'FVG_BULLISH': 'FVG Bullish',
        'FVG_BEARISH': 'FVG Bearish',
        'BREAKOUT_RESISTANCE': 'Breakout',
        'BREAKOUT_SUPPORT': 'Breakdown',
        'FAKE_BREAK_RESISTANCE': 'Falso Breakout',
        'FAKE_BREAK_SUPPORT': 'Falso Breakdown',
        'GARTLEY': 'Gartley',
        'BUTTERFLY': 'Butterfly',
        'BAT': 'Bat',
        'CRAB': 'Crab',
        'SHARK': 'Shark',
        'HARMONIC': 'Harmonico',
        'HAMMER': 'Hammer',
        'SHOOTING_STAR': 'Shooting Star',
        'BULLISH_ENGULFING': 'Engulfing Rialzista',
        'BEARISH_ENGULFING': 'Engulfing Ribassista'
    };
    
    // Cerca match esatti
    if (patternMap[pattern]) return patternMap[pattern];
    
    // Cerca match parziali
    for (const [key, value] of Object.entries(patternMap)) {
        if (pattern.includes(key)) return value;
    }
    
    // Formatta livelli Fibonacci
    if (pattern.includes('FIB_LEVEL')) {
        return pattern.replace('FIB_LEVEL', 'Fib ');
    }
    
    // Nessun match, ritorna il pattern originale con prima lettera maiuscola
    return pattern.toLowerCase().replace(/(?:^|\s)\S/g, (a) => a.toUpperCase());
}

function setupBottomNavigation() {
    const navItems = document.querySelectorAll('.bottom-nav .nav-item');
    const sections = {
        marketOverview: document.getElementById('marketOverviewSection'),
        signals: document.getElementById('signalsSection'),
        portfolio: document.getElementById('portfolioSection')
    };

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navItems.forEach(navItem => navItem.classList.remove('active'));
            item.classList.add('active');

            Object.values(sections).forEach(section => section.classList.add('d-none'));

            const sectionId = item.dataset.section;
            sections[sectionId].classList.remove('d-none');
        });
    });
}

async function initializeApp() {
    const topCryptos = await fetchTopCryptos();
    renderTopCryptos(topCryptos);

    const cryptoSignals = await getCryptoSignals();
    renderCryptoSignals(cryptoSignals);
    await renderCryptoCharts(cryptoSignals); 

    setupBottomNavigation();
}

document.addEventListener('DOMContentLoaded', initializeApp);
