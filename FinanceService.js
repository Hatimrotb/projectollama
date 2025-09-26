// FinanceService.js
const axios = require('axios');

class FinanceService {
    constructor(apiKey) {
        // Using Finnhub API - free tier with 60 calls/minute
        this.apiKey = apiKey || 'demo';
        this.baseUrl = 'https://finnhub.io/api/v1';
        console.log("💹 FinanceService initialized with Finnhub API (60 calls/min)");
    }

    /**
     * Get real-time stock quote
     * @param {string} symbol Stock symbol (e.g., 'AAPL', 'GOOGL')
     * @returns {Promise<object>} Stock data
     */
    async getStockQuote(symbol) {
        try {
            console.log(`📊 Fetching stock data for: ${symbol}`);
            
            // Use Finnhub Quote API
            const response = await axios.get(`${this.baseUrl}/quote`, {
                params: {
                    symbol: symbol.toUpperCase(),
                    token: this.apiKey
                }
            });

            const quote = response.data;
            
            if (!quote.c || quote.c === 0) {
                console.log(`❌ No data found for ${symbol}`);
                return { error: true, message: `Stock symbol "${symbol}" not found.` };
            }
            
            console.log(`✅ Successfully fetched data for ${symbol}`);

            const change = quote.d || 0;
            const changePercent = quote.dp || 0;

            return {
                symbol: symbol.toUpperCase(),
                price: quote.c || 0,  // Current price
                change: change,
                changePercent: changePercent.toFixed(2),
                volume: 0, // Finnhub doesn't provide volume in quote endpoint
                previousClose: quote.pc || 0,  // Previous close
                open: quote.o || 0,  // Open price
                high: quote.h || 0,  // High price
                low: quote.l || 0,   // Low price
                lastUpdated: new Date().toLocaleDateString(),
                marketCap: 0,
                name: symbol.toUpperCase()
            };

        } catch (error) {
            console.error('❌ Error in FinanceService:', error.message);
            return { error: true, message: 'Failed to fetch stock data.' };
        }
    }

    /**
     * Get market overview (major indices)
     * @returns {Promise<object>} Market overview data
     */
    async getMarketOverview() {
        try {
            console.log('📈 Fetching market overview...');
            
            // Get data for major US stocks as market indicators
            const symbols = ['AAPL', 'GOOGL', 'MSFT']; // Major tech stocks
            const symbolNames = ['Apple', 'Google', 'Microsoft'];
            
            const promises = symbols.map(symbol => this.getStockQuote(symbol));
            const results = await Promise.all(promises);

            const marketData = {
                indices: [],
                lastUpdated: new Date().toISOString()
            };

            results.forEach((result, index) => {
                if (!result.error) {
                    marketData.indices.push({
                        name: symbolNames[index],
                        symbol: symbols[index],
                        price: result.price,
                        change: result.change,
                        changePercent: result.changePercent
                    });
                }
            });

            return marketData;

        } catch (error) {
            console.error('❌ Error fetching market overview:', error.message);
            return { error: true, message: 'Failed to fetch market overview.' };
        }
    }

    /**
     * Get intraday stock data for charts
     * @param {string} symbol Stock symbol
     * @returns {Promise<object>} Chart data
     */
    async getIntradayData(symbol) {
        try {
            console.log(`📊 Fetching intraday data for: ${symbol}`);
            const response = await axios.get(this.baseUrl, {
                params: {
                    function: 'TIME_SERIES_INTRADAY',
                    symbol: symbol.toUpperCase(),
                    interval: '60min',
                    apikey: this.apiKey
                }
            });

            const data = response.data;
            
            if (data['Error Message'] || data['Note']) {
                return { error: true, message: 'Unable to fetch chart data.' };
            }

            const timeSeries = data['Time Series (60min)'];
            if (!timeSeries) {
                return { error: true, message: 'No chart data available.' };
            }

            // Convert to chart-friendly format
            const chartData = {
                labels: [],
                prices: [],
                volumes: []
            };

            // Get last 24 hours of data
            const entries = Object.entries(timeSeries).slice(0, 24).reverse();
            
            entries.forEach(([time, values]) => {
                const hour = new Date(time).toLocaleTimeString('en-US', { 
                    hour: '2-digit', 
                    minute: '2-digit' 
                });
                chartData.labels.push(hour);
                chartData.prices.push(parseFloat(values['4. close']));
                chartData.volumes.push(parseInt(values['5. volume']));
            });

            return {
                symbol: symbol.toUpperCase(),
                chartData,
                lastUpdated: new Date().toISOString()
            };

        } catch (error) {
            console.error('❌ Error fetching intraday data:', error.message);
            return { error: true, message: 'Failed to fetch chart data.' };
        }
    }

    /**
     * Search for stock symbols
     * @param {string} keywords Search keywords
     * @returns {Promise<object>} Search results
     */
    async searchSymbols(keywords) {
        try {
            console.log(`🔍 Searching for symbols: ${keywords}`);
            const response = await axios.get(this.baseUrl, {
                params: {
                    function: 'SYMBOL_SEARCH',
                    keywords: keywords,
                    apikey: this.apiKey
                }
            });

            const data = response.data;
            
            if (data['Error Message'] || data['Note']) {
                return { error: true, message: 'Search failed.' };
            }

            const matches = data['bestMatches'] || [];
            
            return {
                results: matches.slice(0, 5).map(match => ({
                    symbol: match['1. symbol'],
                    name: match['2. name'],
                    type: match['3. type'],
                    region: match['4. region'],
                    currency: match['8. currency']
                }))
            };

        } catch (error) {
            console.error('❌ Error searching symbols:', error.message);
            return { error: true, message: 'Search failed.' };
        }
    }
}

module.exports = FinanceService;
