// mobile-optimized.js
// Script di ottimizzazione delle prestazioni per dispositivi mobili

(function() {
    // Rileva se siamo su un dispositivo a basse prestazioni
    const isLowEndDevice = navigator.deviceMemory < 4 || 
                          navigator.hardwareConcurrency < 4;
    
    // Configura ottimizzazioni generali
    function applyMobileOptimizations() {
        // Mostra un messaggio di debug
        console.log('Applying mobile optimizations... Low-end device:', isLowEndDevice);
        
        // Limita il framerate di animazione per ridurre il carico CPU
        if (isLowEndDevice) {
            limitAnimationFrameRate();
        }
        
        // Ottimizza lo scrolling
        optimizeScrolling();
        
        // Ottimizza i caricamenti
        setupLazyLoading();
        
        // Nasconde il loader iniziale se è ancora visibile dopo 5 secondi
        setTimeout(() => {
            const loader = document.getElementById('initial-loader');
            if (loader && loader.style.display !== 'none') {
                loader.style.display = 'none';
            }
        }, 5000);
    }
    
    // Limita il framerate di animazione per risparmiare CPU
    function limitAnimationFrameRate() {
        const originalRAF = window.requestAnimationFrame;
        let lastTime = 0;
        const targetFPS = 30; // Su dispositivi a basse prestazioni limitiamo a 30fps
        const interval = 1000 / targetFPS;
        
        window.requestAnimationFrame = function(callback) {
            const currentTime = performance.now();
            const delta = currentTime - lastTime;
            
            if (delta > interval) {
                lastTime = currentTime - (delta % interval);
                return originalRAF(callback);
            } else {
                // Salta il frame se troppo vicino all'ultimo
                return setTimeout(() => {
                    const newTime = performance.now();
                    lastTime = newTime;
                    callback(newTime);
                }, interval - delta);
            }
        };
    }
    
    // Ottimizza lo scrolling per evitare jank
    function optimizeScrolling() {
        const scrollableElements = document.querySelectorAll('.scrollable-section');
        
        // Usa passive listeners per migliorare lo scrolling
        scrollableElements.forEach(el => {
            el.addEventListener('touchstart', () => {}, { passive: true });
            el.addEventListener('touchmove', () => {}, { passive: true });
            el.addEventListener('wheel', () => {}, { passive: true });
            
            // Aggiungi overscroll-behavior per evitare lo scrolling a cascata
            el.style.overscrollBehavior = 'contain';
            
            // Aggiungi CSS will-change per hint al browser
            el.style.willChange = 'transform';
        });
    }
    
    // Imposta lazy loading per immagini e grafici
    function setupLazyLoading() {
        // Quando si passa da una tab all'altra, rimuoviamo i grafici non visibili
        const tabButtons = document.querySelectorAll('.bottom-nav .nav-item');
        tabButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetSection = btn.dataset.section;
                
                // Se non è la sezione portfolio/charts, possiamo liberare memoria
                if (targetSection !== 'portfolio') {
                    const canvases = document.querySelectorAll('canvas:not(#cryptoChart)');
                    if (canvases.length > 5) { // Manteniamo alcuni grafici in memoria
                        for (let i = 5; i < canvases.length; i++) {
                            const canvas = canvases[i];
                            const chartInstance = Chart.getChart(canvas);
                            if (chartInstance) {
                                chartInstance.destroy();
                            }
                        }
                    }
                }
            });
        });
    }
    
    // Ottimizza la cache delle immagini
    function optimizeImageCache() {
        // Configurazione per bassa memoria
        if (isLowEndDevice) {
            // Limita il numero di immagini in cache
            if (window.caches) {
                caches.open('image-cache').then(cache => {
                    cache.keys().then(keys => {
                        if (keys.length > 50) { // Mantieni solo 50 immagini in cache
                            keys.slice(50).forEach(request => {
                                cache.delete(request);
                            });
                        }
                    });
                });
            }
        }
    }
    
    // Gestisci errori non catturati
    function setupErrorHandling() {
        window.addEventListener('error', function(e) {
            console.error('Global error:', e.message);
            // Evita crash dovuti a errori JS
            return true;
        });
        
        window.addEventListener('unhandledrejection', function(e) {
            console.error('Unhandled promise rejection:', e.reason);
            // Evita crash dovuti a promise non gestite
            return true;
        });
    }
    
    // Ottimizza le chiamate API riducendo le richieste
    function optimizeAPIcalls() {
        const originalFetch = window.fetch;
        
        // Throttling delle API calls per evitare troppe richieste
        window.fetch = function(...args) {
            const url = args[0].toString();
            
            // Sostituisci le chiamate per dati storici lunghi con versioni più brevi su dispositivi mobili
            if (url.includes('/market_chart?vs_currency=usd&days=90')) {
                const newUrl = url.replace('days=90', 'days=30');
                args[0] = newUrl;
            }
            
            return originalFetch.apply(this, args);
        };
    }
    
    // Avvia tutte le ottimizzazioni
    function init() {
        applyMobileOptimizations();
        optimizeImageCache();
        setupErrorHandling();
        optimizeAPIcalls();
        
        // Ascolta cambiamenti della visibilità della pagina
        document.addEventListener('visibilitychange', function() {
            if (document.visibilityState === 'hidden') {
                // Pulizia quando l'app è in background
                console.log('App in background, releasing resources');
            } else if (document.visibilityState === 'visible') {
                // Ripristina risorse quando l'app torna in foreground
                console.log('App in foreground, restoring resources');
            }
        });
    }
    
    // Avvia ottimizzazioni solo se siamo effettivamente su mobile
    if (window.innerWidth < 768 || isLowEndDevice) {
        // Avvia subito le ottimizzazioni critiche
        document.addEventListener('DOMContentLoaded', init);
    }
})(); 