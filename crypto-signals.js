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
        
        for (const crypto of cryptos.filter(c => c.market_cap > 5_000_000)) {
            // Ottieni dati storici per analisi avanzata
            const historicalData = await getCryptoFullHistoricalData(crypto.id, 30);
            if (!historicalData) continue;
            
            // Esegui analisi avanzata per determinare il segnale
            const analysis = advancedTechnicalAnalysis(crypto, historicalData);
            
            // Verifica se il segnale è abbastanza forte per essere considerato
            if (analysis.signalStrength < 70) continue;
            
            // Calcola livelli di ingresso, target e stop loss
            const entryPrice = crypto.current_price;
            const targetPrice = calculatePreciseTargetPrice(crypto, analysis);
            const stopLoss = calculatePreciseStopLoss(crypto, analysis);
            
            // Calcola supporti e resistenze avanzati
            const { support, resistance } = calculateAdvancedSupportResistance(crypto, historicalData);
            
            signals.push({
                id: crypto.id,
                pair: `${crypto.symbol.toUpperCase()}/USDT`,
                name: crypto.name,
                signalType: analysis.signalType,
                entryPrice: entryPrice.toFixed(4),
                targetPrice: targetPrice.toFixed(4),
                stopLoss: stopLoss.toFixed(4),
                support: support.map(s => s.toFixed(4)),
                resistance: resistance.map(r => r.toFixed(4)),
                potentialGain: ((targetPrice - entryPrice) / entryPrice * 100).toFixed(2),
                riskReward: calculateRiskReward(entryPrice, targetPrice, stopLoss),
                confidence: analysis.signalStrength,
                priceChange24h: crypto.price_change_percentage_24h.toFixed(2),
                indicators: {
                    rsi: analysis.rsi,
                    macd: analysis.macd,
                    trendStrength: analysis.trendStrength,
                    patternDetected: analysis.patternDetected
                }
            });
        }
        
        return signals
            .filter(signal => 
                signal.signalType !== 'NEUTRAL' && 
                Math.abs(parseFloat(signal.potentialGain)) > 3 &&
                parseFloat(signal.confidence) > 70
            )
            .sort((a, b) => b.confidence - a.confidence)
            .slice(0, 20);
    } catch (error) {
        console.error('Error generating crypto signals:', error);
        return [];
    }
}

function advancedTechnicalAnalysis(crypto, historicalData) {
    const { prices, volumes } = historicalData;
    
    // Calcola gli indicatori tecnici
    const sma20 = calculateSMA(prices, 20);
    const sma50 = calculateSMA(prices, 50);
    const sma200 = calculateSMA(prices, 200);
    const ema20 = calculateEMA(prices, 20);
    const ema50 = calculateEMA(prices, 50);
    const rsi = calculateRSI(prices, 14);
    const macd = calculateMACD(prices, 12, 26, 9);
    const { upper: bbandsUpper, lower: bbandsLower } = calculateBollingerBands(prices, 20, 2);
    
    // Analisi del volume
    const volumeAnalysis = analyzeVolume(volumes, 20);
    
    // Rilevamento di pattern candelstick
    const candlePatterns = detectCandlePatterns(prices);
    
    // Rilevamento di supporti e resistenze
    const levels = detectKeyLevels(prices, 20);
    
    // Determina la forza del trend corrente
    const trendStrength = determineTrendStrength(prices, sma20, sma50, sma200, rsi);
    
    // Verifica se siamo in un'area di ipercomprato o ipervenduto
    const isOverbought = rsi > 70;
    const isOversold = rsi < 30;
    
    // Verifica di divergenze RSI
    const rsiDivergence = detectRSIDivergence(prices, rsi);
    
    // Rilevamento cross importanti
    const goldCross = detectCross(sma50, sma200, true);  // SMA50 incrocia SMA200 dal basso
    const deathCross = detectCross(sma50, sma200, false); // SMA50 incrocia SMA200 dall'alto
    
    // Verifica MACD per cambi di trend
    const macdCrossover = detectMACDCrossover(macd);
    
    // Analisi delle Bollinger Bands
    const bbSqueeze = detectBollingerSqueeze(bbandsUpper, bbandsLower, 20);
    const bbBreakout = detectBollingerBreakout(prices, bbandsUpper, bbandsLower);
    
    // Analisi finale per determinare il segnale
    let signalType = 'NEUTRAL';
    let signalStrength = 50;
    let patternDetected = 'NESSUNO';
    
    // Segnali di ACQUISTO
    if (
        (isOversold && rsiDivergence === 'BULLISH') || 
        (goldCross && trendStrength > 0.7) || 
        (macdCrossover === 'BULLISH' && prices[prices.length-1] > sma50[sma50.length-1]) ||
        (bbBreakout === 'UP' && volumeAnalysis > 1.5) ||
        (candlePatterns.includes('HAMMER') || candlePatterns.includes('BULLISH_ENGULFING') || candlePatterns.includes('MORNING_STAR'))
    ) {
        signalType = 'BUY';
        signalStrength = 70;
        
        // Aumenta la forza del segnale in base a condizioni aggiuntive
        if (isOversold) signalStrength += 5;
        if (rsiDivergence === 'BULLISH') signalStrength += 10;
        if (goldCross) signalStrength += 15;
        if (macdCrossover === 'BULLISH') signalStrength += 10;
        if (volumeAnalysis > 1.5) signalStrength += 5;
        if (candlePatterns.length > 0) {
            signalStrength += 10;
            patternDetected = candlePatterns[0];
        }
        if (bbBreakout === 'UP') signalStrength += 5;
        
        // Limita la forza del segnale
        signalStrength = Math.min(signalStrength, 98);
    }
    
    // Segnali di VENDITA
    else if (
        (isOverbought && rsiDivergence === 'BEARISH') || 
        (deathCross && trendStrength < -0.7) || 
        (macdCrossover === 'BEARISH' && prices[prices.length-1] < sma50[sma50.length-1]) ||
        (bbBreakout === 'DOWN' && volumeAnalysis > 1.5) ||
        (candlePatterns.includes('SHOOTING_STAR') || candlePatterns.includes('BEARISH_ENGULFING') || candlePatterns.includes('EVENING_STAR'))
    ) {
        signalType = 'SELL';
        signalStrength = 70;
        
        // Aumenta la forza del segnale in base a condizioni aggiuntive
        if (isOverbought) signalStrength += 5;
        if (rsiDivergence === 'BEARISH') signalStrength += 10;
        if (deathCross) signalStrength += 15;
        if (macdCrossover === 'BEARISH') signalStrength += 10;
        if (volumeAnalysis > 1.5) signalStrength += 5;
        if (candlePatterns.length > 0) {
            signalStrength += 10;
            patternDetected = candlePatterns[0];
        }
        if (bbBreakout === 'DOWN') signalStrength += 5;
        
        // Limita la forza del segnale
        signalStrength = Math.min(signalStrength, 98);
    }
    
    return {
        signalType,
        signalStrength,
        rsi: Math.round(rsi),
        macd: macd.histogram[macd.histogram.length-1].toFixed(4),
        trendStrength: trendStrength.toFixed(2),
        patternDetected
    };
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
    const { prices } = historicalData;
    const currentPrice = crypto.current_price;
    
    // Cerca i swing high e swing low recenti
    const swings = findPriceSwings(prices, 10);
    
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
    
    return {
        support: supports.length > 0 ? supports : [currentPrice * 0.95, currentPrice * 0.9, currentPrice * 0.85],
        resistance: resistances.length > 0 ? resistances : [currentPrice * 1.05, currentPrice * 1.1, currentPrice * 1.15]
    };
}

function findPriceSwings(prices, period) {
    const highs = [];
    const lows = [];
    
    // Cerca pivot points (minimi e massimi locali)
    for (let i = period; i < prices.length - period; i++) {
        const leftPrices = prices.slice(i - period, i);
        const rightPrices = prices.slice(i + 1, i + period + 1);
        const currentPrice = prices[i];
        
        // Verifica se il punto corrente è un massimo locale
        if (currentPrice > Math.max(...leftPrices) && currentPrice > Math.max(...rightPrices)) {
            highs.push(currentPrice);
        }
        
        // Verifica se il punto corrente è un minimo locale
        if (currentPrice < Math.min(...leftPrices) && currentPrice < Math.min(...rightPrices)) {
            lows.push(currentPrice);
        }
    }
    
    return { highs, lows };
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
