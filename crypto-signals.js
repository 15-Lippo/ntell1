export async function getTopCryptos() {
    try {
        const response = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=500&page=1&sparkline=false');
        const cryptos = await response.json();
        return cryptos
            .filter(crypto => crypto.market_cap > 50_000_000) 
            .map(crypto => ({
                name: crypto.name,
                symbol: crypto.symbol.toUpperCase(),
                currentPrice: crypto.current_price,
                marketCap: crypto.market_cap,
                priceChangePercentage24h: crypto.price_change_percentage_24h,
                rank: crypto.market_cap_rank
            }));
    } catch (error) {
        console.error('Error fetching top cryptocurrencies:', error);
        return [];
    }
}

export async function getCryptoSignals() {
    try {
        const response = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=250&page=1&sparkline=false');
        const cryptos = await response.json();
        
        const signals = [];
        let errorCount = 0;
        
        // Utilizziamo il vecchio metodo come fallback se non ci sono segnali con il nuovo
        const fallbackSignals = [];
        
        for (const crypto of cryptos.filter(c => c.market_cap > 5_000_000)) {
            try {
                // Calcola segnali con il metodo semplice come fallback
                const { signalType, confidence } = enhancedSignalAnalysis(crypto);
                const entryPrice = crypto.current_price;
                const targetPrice = calculateTargetPrice(crypto, signalType);
                const stopLoss = calculateStopLoss(crypto, signalType);
                const { support, resistance } = calculateSupportResistance(crypto);
                
                // Salva il segnale semplice come fallback
                if (signalType !== 'NEUTRAL' && Math.abs((targetPrice - entryPrice) / entryPrice * 100) > 3) {
                    fallbackSignals.push({
                        id: crypto.id,
                        pair: `${crypto.symbol.toUpperCase()}/USDT`,
                        name: crypto.name,
                        signalType,
                        entryPrice: entryPrice.toFixed(4),
                        targetPrice: targetPrice.toFixed(4),
                        stopLoss: stopLoss.toFixed(4),
                        support: support.map(s => s.toFixed(4)),
                        resistance: resistance.map(r => r.toFixed(4)),
                        potentialGain: ((targetPrice - entryPrice) / entryPrice * 100).toFixed(2),
                        riskReward: calculateRiskReward(entryPrice, targetPrice, stopLoss),
                        confidence: confidence,
                        priceChange24h: crypto.price_change_percentage_24h.toFixed(2),
                        indicators: {
                            rsi: 0,
                            macd: "0",
                            trendStrength: "0",
                            patternDetected: "NESSUNO"
                        }
                    });
                }
                
                // Prova ad applicare analisi avanzata
                try {
                    // Ottieni dati storici per analisi avanzata
                    const historicalData = await getCryptoFullHistoricalData(crypto.id, 30);
                    if (!historicalData) continue;
                    
                    // Esegui analisi avanzata per determinare il segnale
                    const analysis = advancedTechnicalAnalysis(crypto, historicalData);
                    
                    // Verifica se il segnale è abbastanza forte per essere considerato
                    // Ridotto a 50 per garantire più segnali
                    if (analysis.signalStrength < 50) continue;
                    
                    // Calcola livelli di ingresso, target e stop loss
                    const preciseTargetPrice = calculatePreciseTargetPrice(crypto, analysis);
                    const preciseStopLoss = calculatePreciseStopLoss(crypto, analysis);
                    
                    // Calcola supporti e resistenze avanzati
                    const advancedLevels = calculateAdvancedSupportResistance(crypto, historicalData);
                    
                    signals.push({
                        id: crypto.id,
                        pair: `${crypto.symbol.toUpperCase()}/USDT`,
                        name: crypto.name,
                        signalType: analysis.signalType,
                        entryPrice: entryPrice.toFixed(4),
                        targetPrice: preciseTargetPrice.toFixed(4),
                        stopLoss: preciseStopLoss.toFixed(4),
                        support: advancedLevels.support.map(s => s.toFixed(4)),
                        resistance: advancedLevels.resistance.map(r => r.toFixed(4)),
                        potentialGain: ((preciseTargetPrice - entryPrice) / entryPrice * 100).toFixed(2),
                        riskReward: calculateRiskReward(entryPrice, preciseTargetPrice, preciseStopLoss),
                        confidence: analysis.signalStrength,
                        priceChange24h: crypto.price_change_percentage_24h.toFixed(2),
                        indicators: {
                            rsi: analysis.rsi,
                            macd: analysis.macd,
                            trendStrength: analysis.trendStrength,
                            patternDetected: analysis.patternDetected
                        }
                    });
                } catch (analysisError) {
                    console.error(`Error in advanced analysis for ${crypto.symbol}:`, analysisError);
                    errorCount++;
                }
            } catch (cryptoError) {
                console.error(`Error processing ${crypto.symbol}:`, cryptoError);
                errorCount++;
            }
        }
        
        console.log(`Generated ${signals.length} advanced signals with ${errorCount} errors`);
        
        // Se non abbiamo abbastanza segnali avanzati, usa i fallback
        let finalSignals = signals;
        if (signals.length < 5 && fallbackSignals.length > 0) {
            console.log(`Using ${fallbackSignals.length} fallback signals`);
            finalSignals = [...signals, ...fallbackSignals];
        }
        
        return finalSignals
            .filter(signal => signal.signalType !== 'NEUTRAL')
            .sort((a, b) => b.confidence - a.confidence)
            .slice(0, 20);
    } catch (error) {
        console.error('Error generating crypto signals:', error);
        
        // Fallback completo: genera alcuni segnali semplici basati su prezzo e volume
        try {
            const response = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&sparkline=false');
            const cryptos = await response.json();
            
            return cryptos
                .filter(crypto => crypto.market_cap > 50_000_000)
                .map(crypto => {
                    const priceChange = crypto.price_change_percentage_24h;
                    const signalType = priceChange > 5 ? 'BUY' : priceChange < -5 ? 'SELL' : 'NEUTRAL';
                    const entryPrice = crypto.current_price;
                    const targetPrice = signalType === 'BUY' ? entryPrice * 1.1 : signalType === 'SELL' ? entryPrice * 0.9 : entryPrice;
                    const stopLoss = signalType === 'BUY' ? entryPrice * 0.95 : signalType === 'SELL' ? entryPrice * 1.05 : entryPrice;
                    
                    return {
                        id: crypto.id,
                        pair: `${crypto.symbol.toUpperCase()}/USDT`,
                        name: crypto.name,
                        signalType,
                        entryPrice: entryPrice.toFixed(4),
                        targetPrice: targetPrice.toFixed(4),
                        stopLoss: stopLoss.toFixed(4),
                        support: [
                            (entryPrice * 0.9).toFixed(4),
                            (entryPrice * 0.85).toFixed(4),
                            (entryPrice * 0.8).toFixed(4)
                        ],
                        resistance: [
                            (entryPrice * 1.1).toFixed(4),
                            (entryPrice * 1.15).toFixed(4),
                            (entryPrice * 1.2).toFixed(4)
                        ],
                        potentialGain: ((targetPrice - entryPrice) / entryPrice * 100).toFixed(2),
                        riskReward: `1:${((targetPrice - entryPrice) / (entryPrice - stopLoss)).toFixed(2)}`,
                        confidence: Math.abs(priceChange) > 10 ? 85 : Math.abs(priceChange) > 5 ? 70 : 60,
                        priceChange24h: priceChange.toFixed(2),
                        indicators: {
                            rsi: 50,
                            macd: "0",
                            trendStrength: "0",
                            patternDetected: "NESSUNO"
                        }
                    };
                })
                .filter(signal => signal.signalType !== 'NEUTRAL')
                .sort((a, b) => Math.abs(parseFloat(b.potentialGain)) - Math.abs(parseFloat(a.potentialGain)))
                .slice(0, 10);
        } catch (fallbackError) {
            console.error('Fallback generation failed:', fallbackError);
            return [];
        }
    }
}

// Manteniamo la funzione originale per l'analisi semplice come fallback
function enhancedSignalAnalysis(crypto) {
    const { 
        price_change_percentage_24h: priceChange, 
        total_volume: volume,
        market_cap: marketCap 
    } = crypto;
    
    let signalType = 'NEUTRAL';
    let confidence = 0;
    
    const volumeIndicator = volume / marketCap;
    const volatilityFactor = Math.abs(priceChange);

    if (priceChange > 5 && volumeIndicator > 0.0005) {
        signalType = 'BUY';
        confidence = Math.min(volatilityFactor * 3, 95);
    } else if (priceChange < -5 && volumeIndicator > 0.0005) {
        signalType = 'SELL';
        confidence = Math.min(volatilityFactor * 3, 95);
    }

    return { 
        signalType, 
        confidence: Math.floor(confidence)
    };
}

function calculateTargetPrice(crypto, signalType) {
    const currentPrice = crypto.current_price;
    const volatility = Math.abs(crypto.price_change_percentage_24h);
    
    return signalType === 'BUY' 
        ? currentPrice * (1 + (0.08 + volatility/100)) 
        : signalType === 'SELL' 
            ? currentPrice * (1 - (0.08 + volatility/100)) 
            : currentPrice;
}

function calculateStopLoss(crypto, signalType) {
    const currentPrice = crypto.current_price;
    const volatility = Math.abs(crypto.price_change_percentage_24h);
    
    return signalType === 'BUY' 
        ? currentPrice * (1 - (0.05 + volatility/200)) 
        : signalType === 'SELL' 
            ? currentPrice * (1 + (0.05 + volatility/200)) 
            : currentPrice;
}

function calculateRiskReward(entry, target, stopLoss) {
    const potentialProfit = Math.abs(target - entry);
    const potentialLoss = Math.abs(entry - stopLoss);
    return potentialLoss > 0 ? `1:${(potentialProfit / potentialLoss).toFixed(2)}` : '1:1';
}

function calculateSupportResistance(crypto) {
    const currentPrice = crypto.current_price;
    const priceChange = crypto.price_change_percentage_24h;
    
    // Enhanced support/resistance calculation with more nuanced approach
    const volatilityFactor = Math.abs(priceChange) / 100;
    const supportLevels = [
        currentPrice * (1 - volatilityFactor * 0.5),  // Weak support
        currentPrice * (1 - volatilityFactor * 1),    // Medium support
        currentPrice * (1 - volatilityFactor * 1.5)   // Strong support
    ];
    
    const resistanceLevels = [
        currentPrice * (1 + volatilityFactor * 0.5),  // Weak resistance
        currentPrice * (1 + volatilityFactor * 1),    // Medium resistance
        currentPrice * (1 + volatilityFactor * 1.5)   // Strong resistance
    ];
    
    return { 
        support: supportLevels,
        resistance: resistanceLevels,
        currentPrice: currentPrice
    };
}

function advancedTechnicalAnalysis(crypto, historicalData) {
    try {
        const { prices, volumes } = historicalData;
        
        if (!prices || prices.length < 50 || !volumes || volumes.length < 50) {
            throw new Error("Dati storici insufficienti per l'analisi");
        }
        
        // Calcola gli indicatori tecnici
        const sma20 = calculateSMA(prices, 20);
        const sma50 = calculateSMA(prices, Math.min(50, prices.length - 1));
        const sma200 = prices.length >= 200 ? calculateSMA(prices, 200) : sma50;
        const ema20 = calculateEMA(prices, 20);
        const ema50 = calculateEMA(prices, Math.min(50, prices.length - 1));
        const rsi = calculateRSI(prices, 14);
        
        // Verifica che ci siano abbastanza dati per MACD
        let macd = { macdLine: [0], signalLine: [0], histogram: [0] };
        try {
            macd = calculateMACD(prices, 12, 26, 9);
        } catch (e) {
            console.warn("Impossibile calcolare MACD, uso valori predefiniti");
        }
        
        // Verifica che ci siano abbastanza dati per Bollinger Bands
        let bbandsUpper = [prices[prices.length - 1] * 1.05];
        let bbandsLower = [prices[prices.length - 1] * 0.95];
        try {
            const bbands = calculateBollingerBands(prices, 20, 2);
            bbandsUpper = bbands.upper;
            bbandsLower = bbands.lower;
        } catch (e) {
            console.warn("Impossibile calcolare Bollinger Bands, uso valori predefiniti");
        }
        
        // Analisi del volume con gestione errori
        let volumeAnalysis = 1;
        try {
            volumeAnalysis = analyzeVolume(volumes, 20);
        } catch (e) {
            console.warn("Errore nell'analisi del volume, uso valore predefinito");
        }
        
        // Rilevamento di pattern candelstick con gestione errori
        let candlePatterns = [];
        try {
            candlePatterns = detectCandlePatterns(prices);
        } catch (e) {
            console.warn("Errore nel rilevamento pattern candlestick");
        }
        
        // Determina la forza del trend corrente
        let trendStrength = 0;
        try {
            trendStrength = determineTrendStrength(prices, sma20, sma50, sma200, rsi);
        } catch (e) {
            console.warn("Errore nel calcolo della forza del trend, uso valore predefinito");
            // Usa il trend basato sulla variazione di prezzo 24h
            trendStrength = crypto.price_change_percentage_24h > 0 ? 0.5 : -0.5;
        }
        
        // Verifica se siamo in un'area di ipercomprato o ipervenduto
        const isOverbought = rsi > 70;
        const isOversold = rsi < 30;
        
        // Verifica di divergenze RSI con gestione errori
        let rsiDivergence = 'NONE';
        try {
            rsiDivergence = detectRSIDivergence(prices, rsi);
        } catch (e) {
            console.warn("Errore nel rilevamento divergenze RSI");
        }
        
        // Rilevamento cross importanti con gestione errori
        let goldCross = false;
        let deathCross = false;
        try {
            goldCross = detectCross(sma50, sma200, true);
            deathCross = detectCross(sma50, sma200, false);
        } catch (e) {
            console.warn("Errore nel rilevamento cross delle medie mobili");
        }
        
        // Verifica MACD per cambi di trend con gestione errori
        let macdCrossover = 'NONE';
        try {
            macdCrossover = detectMACDCrossover(macd);
        } catch (e) {
            console.warn("Errore nel rilevamento crossover MACD");
        }
        
        // Analisi delle Bollinger Bands con gestione errori
        let bbSqueeze = false;
        let bbBreakout = 'NONE';
        try {
            bbSqueeze = detectBollingerSqueeze(bbandsUpper, bbandsLower, 20);
            bbBreakout = detectBollingerBreakout(prices, bbandsUpper, bbandsLower);
        } catch (e) {
            console.warn("Errore nell'analisi delle Bollinger Bands");
        }
        
        // Analisi finale per determinare il segnale
        let signalType = 'NEUTRAL';
        let signalStrength = 50;
        let patternDetected = 'NESSUNO';
        
        // Verifica condizioni di base
        const priceChange = crypto.price_change_percentage_24h;
        if (priceChange > 5) {
            signalType = 'BUY';
            signalStrength = 60;
        } else if (priceChange < -5) {
            signalType = 'SELL';
            signalStrength = 60;
        }
        
        // Segnali di ACQUISTO
        if (
            (isOversold) ||
            (goldCross) || 
            (macdCrossover === 'BULLISH') ||
            (bbBreakout === 'UP') ||
            (candlePatterns.includes('HAMMER') || candlePatterns.includes('BULLISH_ENGULFING'))
        ) {
            signalType = 'BUY';
            signalStrength = 60;
            
            // Aumenta la forza del segnale in base a condizioni aggiuntive
            if (isOversold) signalStrength += 5;
            if (rsiDivergence === 'BULLISH') signalStrength += 10;
            if (goldCross) signalStrength += 10;
            if (macdCrossover === 'BULLISH') signalStrength += 10;
            if (volumeAnalysis > 1.5) signalStrength += 5;
            if (candlePatterns.length > 0) {
                signalStrength += 10;
                patternDetected = candlePatterns[0];
            }
            if (bbBreakout === 'UP') signalStrength += 5;
            if (trendStrength > 0) signalStrength += 5;
            
            // Limita la forza del segnale
            signalStrength = Math.min(signalStrength, 98);
        }
        
        // Segnali di VENDITA
        else if (
            (isOverbought) ||
            (deathCross) || 
            (macdCrossover === 'BEARISH') ||
            (bbBreakout === 'DOWN') ||
            (candlePatterns.includes('SHOOTING_STAR') || candlePatterns.includes('BEARISH_ENGULFING'))
        ) {
            signalType = 'SELL';
            signalStrength = 60;
            
            // Aumenta la forza del segnale in base a condizioni aggiuntive
            if (isOverbought) signalStrength += 5;
            if (rsiDivergence === 'BEARISH') signalStrength += 10;
            if (deathCross) signalStrength += 10;
            if (macdCrossover === 'BEARISH') signalStrength += 10;
            if (volumeAnalysis > 1.5) signalStrength += 5;
            if (candlePatterns.length > 0) {
                signalStrength += 10;
                patternDetected = candlePatterns[0];
            }
            if (bbBreakout === 'DOWN') signalStrength += 5;
            if (trendStrength < 0) signalStrength += 5;
            
            // Limita la forza del segnale
            signalStrength = Math.min(signalStrength, 98);
        }
        
        // Valori MACD e RSI garantiti
        const macdValue = macd.histogram && macd.histogram.length > 0 ? 
            macd.histogram[macd.histogram.length-1].toFixed(4) : "0.0000";
        const rsiValue = typeof rsi === 'number' ? Math.round(rsi) : 50;
        
        return {
            signalType,
            signalStrength,
            rsi: rsiValue,
            macd: macdValue,
            trendStrength: typeof trendStrength === 'number' ? trendStrength.toFixed(2) : "0.00",
            patternDetected: patternDetected || 'NESSUNO'
        };
    } catch (error) {
        console.error("Errore nell'analisi tecnica avanzata:", error);
        // Fallback semplice
        const priceChange = crypto.price_change_percentage_24h;
        const volatility = Math.abs(priceChange);
        const signalType = priceChange > 5 ? 'BUY' : priceChange < -5 ? 'SELL' : 'NEUTRAL';
        const confidence = Math.min(volatility * 3, 90);
        
        return {
            signalType,
            signalStrength: Math.floor(confidence),
            rsi: 50,
            macd: "0.0000",
            trendStrength: "0.00",
            patternDetected: 'NESSUNO'
        };
    }
}

function calculatePreciseTargetPrice(crypto, analysis) {
    const currentPrice = crypto.current_price;
    const volatility = Math.abs(crypto.price_change_percentage_24h) / 100;
    
    // Calcola target price in base al tipo di segnale e alla forza
    if (analysis.signalType === 'BUY') {
        // Target più conservativo se la forza del segnale è minore
        if (analysis.signalStrength < 80) {
            return currentPrice * (1 + (0.05 + volatility));
        } 
        // Target più aggressivo se la forza del segnale è maggiore
        else {
            return currentPrice * (1 + (0.08 + volatility * 1.5));
        }
    } 
    else if (analysis.signalType === 'SELL') {
        // Target più conservativo se la forza del segnale è minore
        if (analysis.signalStrength < 80) {
            return currentPrice * (1 - (0.05 + volatility));
        } 
        // Target più aggressivo se la forza del segnale è maggiore
        else {
            return currentPrice * (1 - (0.08 + volatility * 1.5));
        }
    }
    
    return currentPrice;
}

function calculatePreciseStopLoss(crypto, analysis) {
    const currentPrice = crypto.current_price;
    const volatility = Math.abs(crypto.price_change_percentage_24h) / 100;
    const atr = calculateATR(crypto, 14);
    
    // Stop loss basato sull'ATR per una maggiore precisione
    if (analysis.signalType === 'BUY') {
        return currentPrice * (1 - Math.max(0.02, atr * 1.5));
    } 
    else if (analysis.signalType === 'SELL') {
        return currentPrice * (1 + Math.max(0.02, atr * 1.5));
    }
    
    return currentPrice;
}

function calculateAdvancedSupportResistance(crypto, historicalData) {
    try {
        const { prices } = historicalData;
        const currentPrice = crypto.current_price;
        
        if (!prices || prices.length < 20) {
            throw new Error("Dati insufficienti per calcolare supporti e resistenze");
        }
        
        // Cerca i swing high e swing low recenti
        const swings = findPriceSwings(prices, Math.min(10, Math.floor(prices.length / 5)));
        
        // Identifica zone di supporto dalle oscillazioni basse recenti
        const supports = swings.lows
            .filter(price => price < currentPrice)
            .sort((a, b) => b - a)
            .slice(0, 3);
        
        // Identifica zone di resistenza dalle oscillazioni alte recenti
        const resistances = swings.highs
            .filter(price => price > currentPrice)
            .sort((a, b) => a - b)
            .slice(0, 3);
        
        // Se non ci sono abbastanza livelli, usa il calcolo basato sulla volatilità
        const fallbackLevels = calculateSupportResistance(crypto);
        
        return {
            support: supports.length > 0 ? supports : fallbackLevels.support,
            resistance: resistances.length > 0 ? resistances : fallbackLevels.resistance
        };
    } catch (error) {
        console.error("Errore nel calcolo dei supporti e resistenze:", error);
        
        // Fallback: usa un calcolo semplice basato sulla volatilità
        const volatilityFactor = Math.abs(crypto.price_change_percentage_24h) / 100;
        return {
            support: [
                crypto.current_price * (1 - volatilityFactor * 0.5),
                crypto.current_price * (1 - volatilityFactor * 1),
                crypto.current_price * (1 - volatilityFactor * 1.5)
            ],
            resistance: [
                crypto.current_price * (1 + volatilityFactor * 0.5),
                crypto.current_price * (1 + volatilityFactor * 1),
                crypto.current_price * (1 + volatilityFactor * 1.5)
            ]
        };
    }
}

function findPriceSwings(prices, period) {
    try {
        if (!prices || prices.length < period * 2 + 1) {
            throw new Error(`Dati insufficienti per trovare swing points. Servono almeno ${period * 2 + 1} punti.`);
        }
        
        // Adatta il periodo se troppo grande rispetto ai dati
        const safePeriod = Math.min(period, Math.floor(prices.length / 5));
        
        const highs = [];
        const lows = [];
        
        // Cerca pivot points (minimi e massimi locali)
        for (let i = safePeriod; i < prices.length - safePeriod; i++) {
            try {
                const leftPrices = prices.slice(i - safePeriod, i);
                const rightPrices = prices.slice(i + 1, i + safePeriod + 1);
                const currentPrice = prices[i];
                
                if (!leftPrices.length || !rightPrices.length) continue;
                
                // Verifica se il punto corrente è un massimo locale
                if (currentPrice > Math.max(...leftPrices) && currentPrice > Math.max(...rightPrices)) {
                    highs.push(currentPrice);
                }
                
                // Verifica se il punto corrente è un minimo locale
                if (currentPrice < Math.min(...leftPrices) && currentPrice < Math.min(...rightPrices)) {
                    lows.push(currentPrice);
                }
            } catch (innerError) {
                console.warn(`Errore nell'analisi del punto ${i}:`, innerError);
                continue;
            }
        }
        
        // Se non abbiamo trovato abbastanza swing points, usa un metodo più semplice
        if (highs.length < 2 || lows.length < 2) {
            // Trova semplicemente i massimi e minimi recenti
            const lastSegment = prices.slice(-20);
            const max = Math.max(...lastSegment);
            const min = Math.min(...lastSegment);
            
            // Aggiungi questi punti se non ci sono già
            if (highs.length === 0) highs.push(max);
            if (lows.length === 0) lows.push(min);
        }
        
        return { highs, lows };
    } catch (error) {
        console.error('Errore nel trovare swing points:', error);
        // Fallback: trova semplicemente massimo e minimo dell'intero array
        const max = Math.max(...prices);
        const min = Math.min(...prices);
        return {
            highs: [max],
            lows: [min]
        };
    }
}

function calculateATR(crypto, period) {
    // Implementazione semplificata dell'ATR basata sulla volatilità
    return Math.abs(crypto.price_change_percentage_24h) / 100 / 5;
}

function calculateMACD(prices, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
    const fastEMA = calculateEMA(prices, fastPeriod);
    const slowEMA = calculateEMA(prices, slowPeriod);
    
    // Calcola la linea MACD (differenza tra EMA veloce e lenta)
    const macdLine = [];
    const shortestLength = Math.min(fastEMA.length, slowEMA.length);
    
    for (let i = 0; i < shortestLength; i++) {
        macdLine.push(fastEMA[fastEMA.length - shortestLength + i] - slowEMA[slowEMA.length - shortestLength + i]);
    }
    
    // Calcola la linea del segnale (EMA della linea MACD)
    const signalLine = calculateEMA(macdLine, signalPeriod);
    
    // Calcola l'istogramma (differenza tra linea MACD e linea del segnale)
    const histogram = [];
    for (let i = 0; i < signalLine.length; i++) {
        histogram.push(macdLine[macdLine.length - signalLine.length + i] - signalLine[i]);
    }
    
    return {
        macdLine,
        signalLine,
        histogram
    };
}

function detectRSIDivergence(prices, rsi) {
    // Prendi gli ultimi 14 punti per l'analisi
    const recentPrices = prices.slice(-14);
    const recentRSI = rsi.slice(-14);
    
    // Cerca i massimi locali nei prezzi e nel RSI
    let priceHighs = [];
    let rsiHighs = [];
    
    // Cerca i minimi locali nei prezzi e nel RSI
    let priceLows = [];
    let rsiLows = [];
    
    for (let i = 1; i < recentPrices.length - 1; i++) {
        // Massimi locali
        if (recentPrices[i] > recentPrices[i-1] && recentPrices[i] > recentPrices[i+1]) {
            priceHighs.push({ index: i, value: recentPrices[i] });
        }
        if (recentRSI[i] > recentRSI[i-1] && recentRSI[i] > recentRSI[i+1]) {
            rsiHighs.push({ index: i, value: recentRSI[i] });
        }
        
        // Minimi locali
        if (recentPrices[i] < recentPrices[i-1] && recentPrices[i] < recentPrices[i+1]) {
            priceLows.push({ index: i, value: recentPrices[i] });
        }
        if (recentRSI[i] < recentRSI[i-1] && recentRSI[i] < recentRSI[i+1]) {
            rsiLows.push({ index: i, value: recentRSI[i] });
        }
    }
    
    // Verifica divergenza rialzista: prezzi fanno minimi più bassi ma RSI fa minimi più alti
    if (priceLows.length >= 2 && rsiLows.length >= 2) {
        if (priceLows[priceLows.length-1].value < priceLows[priceLows.length-2].value && 
            rsiLows[rsiLows.length-1].value > rsiLows[rsiLows.length-2].value) {
            return 'BULLISH';
        }
    }
    
    // Verifica divergenza ribassista: prezzi fanno massimi più alti ma RSI fa massimi più bassi
    if (priceHighs.length >= 2 && rsiHighs.length >= 2) {
        if (priceHighs[priceHighs.length-1].value > priceHighs[priceHighs.length-2].value && 
            rsiHighs[rsiHighs.length-1].value < rsiHighs[rsiHighs.length-2].value) {
            return 'BEARISH';
        }
    }
    
    return 'NONE';
}

function detectCross(shortMA, longMA, isGoldenCross) {
    // Dobbiamo avere almeno 2 punti per verificare un incrocio
    if (shortMA.length < 2 || longMA.length < 2) return false;
    
    // Prendi gli ultimi due punti per ogni MA
    const short1 = shortMA[shortMA.length - 2];
    const short2 = shortMA[shortMA.length - 1];
    const long1 = longMA[longMA.length - 2];
    const long2 = longMA[longMA.length - 1];
    
    // Verifica se c'è stato un incrocio (Golden Cross: short incrocia long dal basso)
    if (isGoldenCross) {
        return short1 < long1 && short2 > long2;
    } 
    // Death Cross: short incrocia long dall'alto
    else {
        return short1 > long1 && short2 < long2;
    }
}

function detectMACDCrossover(macd) {
    const { histogram } = macd;
    
    // Abbiamo bisogno di almeno 2 punti per individuare un crossover
    if (histogram.length < 2) return 'NONE';
    
    // Verifica se l'istogramma è passato da negativo a positivo (segnale rialzista)
    if (histogram[histogram.length - 2] < 0 && histogram[histogram.length - 1] > 0) {
        return 'BULLISH';
    }
    
    // Verifica se l'istogramma è passato da positivo a negativo (segnale ribassista)
    if (histogram[histogram.length - 2] > 0 && histogram[histogram.length - 1] < 0) {
        return 'BEARISH';
    }
    
    return 'NONE';
}

function detectBollingerSqueeze(upper, lower, period) {
    // Prendi le ultime bande di Bollinger per verificare se c'è una "stretta"
    const recentUpper = upper.slice(-period);
    const recentLower = lower.slice(-period);
    
    // Calcola la distanza media tra le bande
    let sumDistance = 0;
    for (let i = 0; i < recentUpper.length; i++) {
        sumDistance += recentUpper[i] - recentLower[i];
    }
    const avgDistance = sumDistance / recentUpper.length;
    
    // Verifica se la distanza attuale è inferiore alla media (stretta)
    const currentDistance = recentUpper[recentUpper.length-1] - recentLower[recentLower.length-1];
    
    return currentDistance < avgDistance * 0.8;
}

function detectBollingerBreakout(prices, upper, lower) {
    // Dobbiamo avere dati sufficienti
    if (prices.length < 2 || upper.length < 2 || lower.length < 2) return 'NONE';
    
    const lastPrice = prices[prices.length - 1];
    const prevPrice = prices[prices.length - 2];
    const lastUpper = upper[upper.length - 1];
    const lastLower = lower[lower.length - 1];
    
    // Breakout verso l'alto
    if (prevPrice < lastUpper && lastPrice > lastUpper) {
        return 'UP';
    }
    
    // Breakout verso il basso
    if (prevPrice > lastLower && lastPrice < lastLower) {
        return 'DOWN';
    }
    
    return 'NONE';
}

function determineTrendStrength(prices, sma20, sma50, sma200, rsi) {
    let strength = 0;
    
    // Verifica la direzione delle medie mobili
    if (sma20[sma20.length - 1] > sma50[sma50.length - 1]) {
        strength += 0.3; // Trend rialzista a breve termine
    } else {
        strength -= 0.3; // Trend ribassista a breve termine
    }
    
    if (sma50[sma50.length - 1] > sma200[sma200.length - 1]) {
        strength += 0.5; // Trend rialzista a lungo termine
    } else {
        strength -= 0.5; // Trend ribassista a lungo termine
    }
    
    // Verifica la forza del RSI (sopra 50 = rialzista, sotto 50 = ribassista)
    if (rsi > 50) {
        strength += (rsi - 50) / 50; // Più il RSI è alto, più il trend è forte
    } else {
        strength -= (50 - rsi) / 50; // Più il RSI è basso, più il trend è debole
    }
    
    // Limita il valore tra -1 e 1
    return Math.max(-1, Math.min(1, strength));
}

function analyzeVolume(volumes, period) {
    // Calcola il volume medio del periodo specificato
    const recentVolumes = volumes.slice(-period);
    const avgVolume = recentVolumes.reduce((a, b) => a + b, 0) / recentVolumes.length;
    
    // Calcola il rapporto tra il volume attuale e la media
    const currentVolume = volumes[volumes.length - 1];
    
    return currentVolume / avgVolume;
}

function detectKeyLevels(prices, lookbackPeriod) {
    // Utilizza la stessa logica di findPriceSwings ma con una struttura dati diversa
    const levels = [];
    
    // Cerca i livelli chiave guardando ai pivot points
    for (let i = lookbackPeriod; i < prices.length - lookbackPeriod; i++) {
        const leftPrices = prices.slice(i - lookbackPeriod, i);
        const rightPrices = prices.slice(i + 1, i + lookbackPeriod + 1);
        const currentPrice = prices[i];
        
        // Verifica se il punto corrente è un massimo locale (resistenza)
        if (currentPrice > Math.max(...leftPrices) && currentPrice > Math.max(...rightPrices)) {
            levels.push({
                price: currentPrice,
                type: 'resistance',
                strength: calculateLevelStrength(prices, i, currentPrice)
            });
        }
        
        // Verifica se il punto corrente è un minimo locale (supporto)
        if (currentPrice < Math.min(...leftPrices) && currentPrice < Math.min(...rightPrices)) {
            levels.push({
                price: currentPrice,
                type: 'support',
                strength: calculateLevelStrength(prices, i, currentPrice)
            });
        }
    }
    
    // Raggruppa livelli simili (entro un certo range percentuale)
    return consolidateLevels(levels);
}

function calculateLevelStrength(prices, index, levelPrice) {
    // La forza di un livello può dipendere da:
    // 1. Quante volte il prezzo ha reagito a questo livello
    // 2. Il volume scambiato a questo livello (non disponibile in questo contesto semplificato)
    // 3. La durata del livello (quanto tempo ha resistito)
    
    // Qui usiamo una misura semplificata: conta quante volte il prezzo si è avvicinato 
    // a questo livello (entro una certa percentuale)
    let touchCount = 0;
    const threshold = 0.02; // 2% di tolleranza
    
    for (let i = 0; i < prices.length; i++) {
        if (i !== index) {
            const difference = Math.abs(prices[i] - levelPrice) / levelPrice;
            if (difference < threshold) {
                touchCount++;
            }
        }
    }
    
    // Restituisci un punteggio di forza tra 1 e 10
    return Math.min(10, 1 + touchCount);
}

function consolidateLevels(levels) {
    if (levels.length <= 1) return levels;
    
    // Ordina i livelli per prezzo
    levels.sort((a, b) => a.price - b.price);
    
    const consolidated = [];
    let currentGroup = [levels[0]];
    
    // Raggruppa livelli simili (entro il 3% l'uno dall'altro)
    for (let i = 1; i < levels.length; i++) {
        const previousLevel = currentGroup[currentGroup.length - 1];
        const currentLevel = levels[i];
        
        // Se il livello è entro il 3% del precedente, aggiungilo al gruppo attuale
        if ((currentLevel.price - previousLevel.price) / previousLevel.price < 0.03) {
            currentGroup.push(currentLevel);
        } else {
            // Altrimenti, finalizza il gruppo corrente e iniziane uno nuovo
            const avgPrice = currentGroup.reduce((sum, level) => sum + level.price, 0) / currentGroup.length;
            const maxStrength = Math.max(...currentGroup.map(level => level.strength));
            const dominantType = currentGroup.filter(l => l.type === 'support').length > 
                                 currentGroup.filter(l => l.type === 'resistance').length ? 
                                 'support' : 'resistance';
            
            consolidated.push({
                price: avgPrice,
                type: dominantType,
                strength: maxStrength
            });
            
            currentGroup = [currentLevel];
        }
    }
    
    // Aggiungi l'ultimo gruppo
    if (currentGroup.length > 0) {
        const avgPrice = currentGroup.reduce((sum, level) => sum + level.price, 0) / currentGroup.length;
        const maxStrength = Math.max(...currentGroup.map(level => level.strength));
        const dominantType = currentGroup.filter(l => l.type === 'support').length > 
                             currentGroup.filter(l => l.type === 'resistance').length ? 
                             'support' : 'resistance';
        
        consolidated.push({
            price: avgPrice,
            type: dominantType,
            strength: maxStrength
        });
    }
    
    return consolidated;
}

function detectCandlePatterns(prices) {
    // Per una vera analisi delle candele avremmo bisogno di OHLC (Open, High, Low, Close)
    // Questa è una versione semplificata basata sui prezzi di chiusura
    const patterns = [];
    
    // Prendi gli ultimi 5 prezzi per l'analisi
    const recentPrices = prices.slice(-5);
    
    // Pattern Hammer/Shooting Star (approssimazione semplificata)
    if (recentPrices.length >= 3) {
        const prev = recentPrices[recentPrices.length - 3];
        const middle = recentPrices[recentPrices.length - 2];
        const current = recentPrices[recentPrices.length - 1];
        
        // Hammer (dopo un trend ribassista)
        if (prev > middle && current > middle * 1.02) {
            patterns.push('HAMMER');
        }
        
        // Shooting Star (dopo un trend rialzista)
        if (prev < middle && current < middle * 0.98) {
            patterns.push('SHOOTING_STAR');
        }
        
        // Bullish Engulfing (semplificato)
        if (prev > middle && current > prev) {
            patterns.push('BULLISH_ENGULFING');
        }
        
        // Bearish Engulfing (semplificato)
        if (prev < middle && current < prev) {
            patterns.push('BEARISH_ENGULFING');
        }
    }
    
    return patterns;
}

export async function getCryptoHistoricalData(symbol, days = 30) {
    try {
        const response = await fetch(`https://api.coingecko.com/api/v3/coins/${symbol.toLowerCase()}/market_chart?vs_currency=usd&days=${days}`);
        const historicalData = await response.json();
        
        const labels = historicalData.prices.map((_, index) => index);
        const prices = historicalData.prices.map(price => price[1]);
        
        return {
            labels: labels,
            datasets: [{
                label: `${symbol.toUpperCase()} Price`,
                data: prices,
                borderColor: 'rgb(75, 192, 192)',
                tension: 0.1
            }]
        };
    } catch (error) {
        console.error(`Error fetching historical data for ${symbol}:`, error);
        return null;
    }
}

export async function getCryptoFullHistoricalData(symbol, days = 90) {
    try {
        const response = await fetch(`https://api.coingecko.com/api/v3/coins/${symbol.toLowerCase()}/market_chart?vs_currency=usd&days=${days}`);
        const historicalData = await response.json();
        
        const prices = historicalData.prices.map(price => price[1]);
        const volumes = historicalData.total_volumes.map(volume => volume[1]);
        
        // Calculate advanced technical indicators
        const sma20 = calculateSMA(prices, 20);
        const ema50 = calculateEMA(prices, 50);
        const rsi = calculateRSI(prices);
        const bollinger = calculateBollingerBands(prices);
        
        return {
            prices: prices,
            volumes: volumes,
            indicators: {
                sma20: sma20,
                ema50: ema50,
                rsi: rsi,
                bollinger: bollinger
            }
        };
    } catch (error) {
        console.error(`Error fetching full historical data for ${symbol}:`, error);
        return null;
    }
}

function calculateSMA(prices, period) {
    const sma = [];
    for (let i = period - 1; i < prices.length; i++) {
        const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
        sma.push(sum / period);
    }
    return sma;
}

function calculateEMA(prices, period) {
    const multiplier = 2 / (period + 1);
    const ema = [prices[0]];
    
    for (let i = 1; i < prices.length; i++) {
        const emaValue = (prices[i] - ema[i-1]) * multiplier + ema[i-1];
        ema.push(emaValue);
    }
    
    return ema;
}

function calculateRSI(prices, period = 14) {
    const changes = prices.slice(1).map((price, i) => price - prices[i]);
    const gains = changes.map(change => Math.max(change, 0));
    const losses = changes.map(change => Math.abs(Math.min(change, 0)));
    
    const avgGain = calculateAverage(gains, period);
    const avgLoss = calculateAverage(losses, period);
    
    return avgLoss === 0 ? 100 : 100 - (100 / (1 + (avgGain / avgLoss)));
}

function calculateAverage(values, period) {
    const sum = values.slice(0, period).reduce((a, b) => a + b, 0);
    return sum / period;
}

function calculateBollingerBands(prices, period = 20, stdDev = 2) {
    const sma = calculateSMA(prices, period);
    const standardDeviation = calculateStandardDeviation(prices, period);
    
    const upperBand = sma.map((value, index) => 
        value + (standardDeviation[index] * stdDev)
    );
    
    const lowerBand = sma.map((value, index) => 
        value - (standardDeviation[index] * stdDev)
    );
    
    return {
        middle: sma,
        upper: upperBand,
        lower: lowerBand
    };
}

function calculateStandardDeviation(prices, period) {
    const stdDev = [];
    
    for (let i = period - 1; i < prices.length; i++) {
        const periodPrices = prices.slice(i - period + 1, i + 1);
        const mean = periodPrices.reduce((a, b) => a + b, 0) / period;
        
        const variance = periodPrices.reduce((sum, price) => 
            sum + Math.pow(price - mean, 2), 0) / period;
        
        stdDev.push(Math.sqrt(variance));
    }
    
    return stdDev;
}

// Aggiungiamo funzioni per analisi avanzate
function calculateFibonacciLevels(high, low) {
    return {
        level0: high,                        // 0% ritracciamento
        level236: high - (high - low) * 0.236, // 23.6% ritracciamento
        level382: high - (high - low) * 0.382, // 38.2% ritracciamento
        level50: high - (high - low) * 0.5,    // 50% ritracciamento
        level618: high - (high - low) * 0.618, // 61.8% ritracciamento
        level786: high - (high - low) * 0.786, // 78.6% ritracciamento
        level100: low                        // 100% ritracciamento
    };
}

function calculateGannAngles(prices, startIndex) {
    const startPrice = prices[startIndex];
    const timeUnits = 8; // Numero di periodi per l'analisi
    
    // Angoli di Gann standard: 1x1 (45°), 2x1 (63.75°), 1x2 (26.25°), etc.
    return {
        angle1x1: startPrice * (1 + 1/timeUnits),  // 45° - trend forte
        angle1x2: startPrice * (1 + 0.5/timeUnits), // 26.25° - trend moderato
        angle1x4: startPrice * (1 + 0.25/timeUnits), // 14.04° - trend debole
        angle2x1: startPrice * (1 + 2/timeUnits),  // 63.75° - trend molto forte
        angle4x1: startPrice * (1 + 4/timeUnits),  // 75.96° - trend estremo
        angleNeg1x1: startPrice * (1 - 1/timeUnits), // -45° - trend ribassista forte
        angleNeg1x2: startPrice * (1 - 0.5/timeUnits) // -26.25° - trend ribassista moderato
    };
}

function findFairValueGaps(prices, opens, highs, lows) {
    const fvgBullish = [];
    const fvgBearish = [];
    
    // Un FVG bullish si forma quando il low di una candela è più alto dell'high della candela precedente
    // Un FVG bearish si forma quando l'high di una candela è più basso del low della candela precedente
    
    for (let i = 2; i < prices.length; i++) {
        // Simuliamo i dati OHLC dai prezzi disponibili se non abbiamo i dati completi
        const candle1High = highs ? highs[i-2] : prices[i-2] * 1.01;
        const candle1Low = lows ? lows[i-2] : prices[i-2] * 0.99;
        const candle2High = highs ? highs[i-1] : prices[i-1] * 1.01;
        const candle2Low = lows ? lows[i-1] : prices[i-1] * 0.99;
        const candle3High = highs ? highs[i] : prices[i] * 1.01;
        const candle3Low = lows ? lows[i] : prices[i] * 0.99;
        
        // FVG Bullish
        if (candle3Low > candle1High) {
            fvgBullish.push({
                index: i,
                gap: candle3Low - candle1High,
                upper: candle3Low,
                lower: candle1High,
                filled: false
            });
        }
        
        // FVG Bearish
        if (candle3High < candle1Low) {
            fvgBearish.push({
                index: i,
                gap: candle1Low - candle3High,
                upper: candle1Low,
                lower: candle3High,
                filled: false
            });
        }
    }
    
    return { bullish: fvgBullish, bearish: fvgBearish };
}

function identifySupplyDemandZones(prices, volumes) {
    const demandZones = []; // Zone di acquisto (supporto)
    const supplyZones = []; // Zone di vendita (resistenza)
    
    // Per identificare zone valide, cerchiamo rapide inversioni con volume alto
    // seguito da un movimento nella direzione opposta
    
    const windowSize = 5; // Dimensione della finestra di analisi
    
    for (let i = windowSize; i < prices.length - windowSize; i++) {
        const preBars = prices.slice(i - windowSize, i);
        const postBars = prices.slice(i, i + windowSize);
        
        const preBarsTrend = linearRegression(preBars);
        const postBarsTrend = linearRegression(postBars);
        
        // Volume relativo per confermare l'importanza della zona
        const avgVolume = volumes ? 
                         volumes.slice(i - windowSize, i + windowSize).reduce((a, b) => a + b, 0) / (windowSize * 2) : 
                         1;
        const currentVolume = volumes ? volumes[i] : 1;
        const volumeRatio = currentVolume / avgVolume;
        
        // Zona di domanda: inversione dal trend ribassista a rialzista con volume alto
        if (preBarsTrend.slope < -0.001 && postBarsTrend.slope > 0.001 && volumeRatio > 1.2) {
            demandZones.push({
                index: i,
                price: prices[i],
                strength: volumeRatio * Math.abs(postBarsTrend.slope / preBarsTrend.slope),
                upperBound: Math.max(...prices.slice(i, i + 3)),
                lowerBound: Math.min(...prices.slice(i - 3, i))
            });
        }
        
        // Zona di offerta: inversione dal trend rialzista a ribassista con volume alto
        if (preBarsTrend.slope > 0.001 && postBarsTrend.slope < -0.001 && volumeRatio > 1.2) {
            supplyZones.push({
                index: i,
                price: prices[i],
                strength: volumeRatio * Math.abs(postBarsTrend.slope / preBarsTrend.slope),
                upperBound: Math.max(...prices.slice(i - 3, i)),
                lowerBound: Math.min(...prices.slice(i, i + 3))
            });
        }
    }
    
    // Ordina le zone per forza
    demandZones.sort((a, b) => b.strength - a.strength);
    supplyZones.sort((a, b) => b.strength - a.strength);
    
    return {
        demand: demandZones.slice(0, 3), // Prendi le 3 zone più forti
        supply: supplyZones.slice(0, 3)
    };
}

function linearRegression(yValues) {
    const xValues = Array.from({ length: yValues.length }, (_, i) => i);
    const n = xValues.length;
    
    const sum_x = xValues.reduce((a, b) => a + b, 0);
    const sum_y = yValues.reduce((a, b) => a + b, 0);
    const sum_xy = xValues.reduce((a, b, i) => a + b * yValues[i], 0);
    const sum_xx = xValues.reduce((a, b) => a + b * b, 0);
    
    const slope = (n * sum_xy - sum_x * sum_y) / (n * sum_xx - sum_x * sum_x);
    const intercept = (sum_y - slope * sum_x) / n;
    
    return { slope, intercept };
}

function detectBreakouts(prices, volumes, supports, resistances) {
    const breakouts = [];
    const fakeBreakouts = [];
    
    // Analizziamo gli ultimi 30 punti dati
    const lookbackPeriod = Math.min(30, prices.length - 1);
    
    for (let i = prices.length - lookbackPeriod; i < prices.length; i++) {
        // Controlla breakout delle resistenze
        for (const resistance of resistances) {
            // Breakout: il prezzo supera la resistenza
            if (prices[i-1] < resistance && prices[i] > resistance) {
                // Verifica volume per distinguere breakout veri/falsi
                const avgVolume = volumes ? 
                                  volumes.slice(i-5, i).reduce((a, b) => a + b, 0) / 5 : 
                                  1;
                const breakoutVolume = volumes ? volumes[i] : 1;
                
                // Verifica follow-through nei giorni successivi se disponibile
                let followThrough = false;
                if (i < prices.length - 1) {
                    followThrough = prices[i+1] > prices[i];
                }
                
                // Breakout confermato: volume alto e follow-through
                if (breakoutVolume > avgVolume * 1.3 && followThrough) {
                    breakouts.push({
                        index: i,
                        price: prices[i],
                        level: resistance,
                        type: 'resistance',
                        confirmed: true
                    });
                }
                // Falso breakout: volume basso e/o no follow-through
                else {
                    fakeBreakouts.push({
                        index: i,
                        price: prices[i],
                        level: resistance,
                        type: 'resistance',
                        confirmed: false
                    });
                }
            }
        }
        
        // Controlla breakout dei supporti (stessa logica ma inversa)
        for (const support of supports) {
            // Breakdown: il prezzo rompe al ribasso il supporto
            if (prices[i-1] > support && prices[i] < support) {
                const avgVolume = volumes ? 
                                 volumes.slice(i-5, i).reduce((a, b) => a + b, 0) / 5 : 
                                 1;
                const breakoutVolume = volumes ? volumes[i] : 1;
                
                let followThrough = false;
                if (i < prices.length - 1) {
                    followThrough = prices[i+1] < prices[i];
                }
                
                if (breakoutVolume > avgVolume * 1.3 && followThrough) {
                    breakouts.push({
                        index: i,
                        price: prices[i],
                        level: support,
                        type: 'support',
                        confirmed: true
                    });
                } else {
                    fakeBreakouts.push({
                        index: i,
                        price: prices[i],
                        level: support,
                        type: 'support',
                        confirmed: false
                    });
                }
            }
        }
    }
    
    return { breakouts, fakeBreakouts };
}

function detectHarmonicPatterns(prices) {
    const patterns = [];
    const patternDefs = {
        "Gartley": { xaRatio: 0.618, abRatio: 0.382, bcRatio: 0.886, cdRatio: 1.272 },
        "Butterfly": { xaRatio: 0.786, abRatio: 0.382, bcRatio: 0.886, cdRatio: 1.618 },
        "Bat": { xaRatio: 0.382, abRatio: 0.382, bcRatio: 0.886, cdRatio: 2.618 },
        "Crab": { xaRatio: 0.382, abRatio: 0.618, bcRatio: 0.886, cdRatio: 3.618 }
    };
    
    // Cerca quattro punti pivot (XABC) per formare il pattern
    const pivots = findSignificantPivots(prices, 10);
    
    if (pivots.length < 4) return patterns;
    
    for (let i = 0; i < pivots.length - 3; i++) {
        const X = pivots[i];
        const A = pivots[i+1];
        const B = pivots[i+2];
        const C = pivots[i+3];
        
        // Calcoliamo le ratio tra i movimenti
        const xaMove = Math.abs(A.value - X.value);
        const abMove = Math.abs(B.value - A.value);
        const bcMove = Math.abs(C.value - B.value);
        
        // Retracement da XA
        const abRatio = abMove / xaMove;
        // Retracement da AB
        const bcRatio = bcMove / abMove;
        // Proiezione per CD
        const projectionCD = bcMove * 1.27; // Esempio con ratio 1.27 (127%)
        
        // Verifica quali pattern corrispondono
        for (const [patternName, ratios] of Object.entries(patternDefs)) {
            const abMatch = Math.abs(abRatio - ratios.abRatio) < 0.03;
            const bcMatch = Math.abs(bcRatio - ratios.bcRatio) < 0.03;
            
            if (abMatch && bcMatch) {
                patterns.push({
                    name: patternName,
                    points: { X, A, B, C },
                    projectedD: C.value + (C.value > B.value ? projectionCD : -projectionCD),
                    confidence: calculatePatternConfidence(abRatio, bcRatio, ratios)
                });
            }
        }
    }
    
    return patterns;
}

function findSignificantPivots(prices, sensitivity = 5) {
    const pivots = [];
    
    for (let i = sensitivity; i < prices.length - sensitivity; i++) {
        const leftPrices = prices.slice(i - sensitivity, i);
        const rightPrices = prices.slice(i + 1, i + sensitivity + 1);
        const currentPrice = prices[i];
        
        // Swing high (massimo locale)
        if (currentPrice > Math.max(...leftPrices) && currentPrice > Math.max(...rightPrices)) {
            pivots.push({ index: i, value: currentPrice, type: 'high' });
        }
        
        // Swing low (minimo locale)
        if (currentPrice < Math.min(...leftPrices) && currentPrice < Math.min(...rightPrices)) {
            pivots.push({ index: i, value: currentPrice, type: 'low' });
        }
    }
    
    return pivots;
}

function calculatePatternConfidence(abRatio, bcRatio, idealRatios) {
    // Calcola quanto siamo vicini ai ratio ideali
    const abDiff = Math.abs(abRatio - idealRatios.abRatio);
    const bcDiff = Math.abs(bcRatio - idealRatios.bcRatio);
    
    // Più siamo vicini ai ratio ideali, più alta è la confidenza
    const maxDiff = 0.03; // Differenza massima accettabile
    const abConf = Math.max(0, 1 - abDiff / maxDiff);
    const bcConf = Math.max(0, 1 - bcDiff / maxDiff);
    
    // Media delle confidenze
    return Math.round((abConf + bcConf) / 2 * 100);
}
