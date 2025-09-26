require('dotenv').config();
const express = require('express');
const http = require('http');
const socketIO = require('socket.io');
const path = require('path');
const chatter = require('./MyChatterBot');
const GetMeteo = require('./GetMeteo');
const WebSearch = require('./WebSearch');
const FinanceService = require('./FinanceService');

const port = 8080;
const app = express();
const server = http.createServer(app);
const io = socketIO(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});


app.use(express.static(path.join(__dirname, 'public')));


const availableModels = {
    'llama3.2': 'llama3.2',
    'falcon': 'falcon',
    'mistral': 'mistral',
    'codellama': 'codellama',
    'phi': 'phi',
    'neural-chat': 'neural-chat'
};

const meteoService = new GetMeteo(process.env.OPENWEATHER_API_KEY);
const webSearchService = new WebSearch(); // SearXNG - real web search results
const financeService = new FinanceService(process.env.FINNHUB_API_KEY);



const userChatbots = new Map();

io.on('connection', (socket) => {
    console.log(`New user connected: ${socket.id}`);
    
   
    let currentModel = 'llama3.2';
    let mychatterbot = new chatter(currentModel, meteoService, webSearchService, financeService);
    userChatbots.set(socket.id, { bot: mychatterbot, model: currentModel });
    
   
    socket.on('modelChange', async (newModel) => {
        if (availableModels[newModel]) {
            console.log(`User ${socket.id} changing model to: ${newModel}`);
            currentModel = newModel;
            
           
            try {
                const newBot = new chatter(newModel, meteoService, webSearchService, financeService);
                
                
                const isAvailable = await newBot.isModelAvailable();
                if (!isAvailable) {
                    socket.emit('error', `Model "${newModel}" is not installed. Please install it with: ollama pull ${newModel}`);
                    return;
                }
                
                mychatterbot = newBot;
                userChatbots.set(socket.id, { bot: mychatterbot, model: newModel });
                socket.emit('modelChanged', { success: true, model: newModel });
                
            } catch (error) {
                console.error(`Error switching to model ${newModel}:`, error);
                socket.emit('error', `Failed to switch to model ${newModel}. Please ensure Ollama is running and the model is installed.`);
            }
        } else {
            socket.emit('error', `Model ${newModel} is not available in the configuration.`);
        }
    });
    
   
    socket.on('chatmessage', (data) => {
        const message = typeof data === 'string' ? data : data.message;
        const options = typeof data === 'object' ? data.options : {};
        
        console.log(`Message from ${socket.id} (${currentModel}): ${message}`);
        
        const userBot = userChatbots.get(socket.id);
        if (!userBot) {
            socket.emit('error', 'No chatbot initialized. Please refresh the page.');
            return;
        }
        
       
        userBot.bot.chat(message, options)
            .then((answer) => {
                if (answer && answer.type === 'weather') {
                    console.log(`Response to ${socket.id}: [Weather Object] ${answer.text}`);
                } else if (answer && answer.type === 'finance') {
                    console.log(`Response to ${socket.id}: [Finance Object] ${answer.text}`);
                } else {
                    console.log(`Response to ${socket.id}: ${answer}`);
                }
                socket.emit('chatanswer', answer);
            })
            .catch((error) => {
                console.error(`Error processing message for ${socket.id}:`, error);
                socket.emit('error', 'Sorry, I encountered an error processing your message. Please try again.');
            });
    });
  
    socket.on('getAvailableModels', () => {
        socket.emit('availableModels', Object.keys(availableModels));
    });
    
 
    socket.on('disconnect', () => {
        console.log(`User disconnected: ${socket.id}`);
        userChatbots.delete(socket.id);
    });
    
  
    socket.on('error', (error) => {
        console.error(`Socket error for ${socket.id}:`, error);
    });
});


app.use((err, req, res, next) => {
    console.error('Express error:', err.stack);
    res.status(500).send('Something broke!');
});


app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});


app.get('/api/models', async (req, res) => {
    try {
        
        const tempBot = new chatter('llama3.2', meteoService, webSearchService, financeService); 
        const availableOllamaModels = await tempBot.getAvailableModels();
        
        
        const filteredModels = availableOllamaModels
            .filter(model => Object.keys(availableModels).some(configModel => 
                model.name.includes(configModel)))
            .map(model => ({
                name: model.name,
                displayName: model.name.split(':')[0], 
                size: model.size,
                modified: model.modified_at
            }));
        
        res.json({
            models: filteredModels,
            configured: Object.keys(availableModels),
            default: 'llama3.2'
        });
    } catch (error) {
        console.error('Error getting available models:', error);
        res.json({
            models: [],
            configured: Object.keys(availableModels),
            default: 'llama3.2',
            error: 'Could not connect to Ollama'
        });
    }
});


app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        activeConnections: userChatbots.size
    });
});

// New API endpoint for standalone weather requests
app.get('/api/weather/:city', async (req, res) => {
    const city = req.params.city;
    if (!city) {
        return res.status(400).json({ error: true, message: 'City parameter is required.' });
    }

    try {
        const weatherData = await meteoService.getCurrentWeather(city);
        if (weatherData.error) {
            return res.status(404).json(weatherData);
        }
        res.json(weatherData);
    } catch (error) {
        console.error(`Error fetching weather for ${city}:`, error);
        res.status(500).json({ error: true, message: 'Internal server error.' });
    }
});

// New API endpoint for standalone finance requests
app.get('/api/finance/:symbol', async (req, res) => {
    const symbol = req.params.symbol;
    if (!symbol) {
        return res.status(400).json({ error: true, message: 'Symbol parameter is required.' });
    }

    try {
        const stockData = await financeService.getStockQuote(symbol);
        if (stockData.error) {
            return res.status(404).json(stockData);
        }
        res.json(stockData);
    } catch (error) {
        console.error(`Error fetching stock data for ${symbol}:`, error);
        res.status(500).json({ error: true, message: 'Internal server error.' });
    }
});

// API endpoint for market overview
app.get('/api/finance/market/overview', async (req, res) => {
    try {
        const marketData = await financeService.getMarketOverview();
        if (marketData.error) {
            return res.status(500).json(marketData);
        }
        res.json(marketData);
    } catch (error) {
        console.error('Error fetching market overview:', error);
        res.status(500).json({ error: true, message: 'Internal server error.' });
    }
});

// API endpoint for chart data
app.get('/api/finance/:symbol/chart', async (req, res) => {
    const symbol = req.params.symbol;
    if (!symbol) {
        return res.status(400).json({ error: true, message: 'Symbol parameter is required.' });
    }

    try {
        const chartData = await financeService.getIntradayData(symbol);
        if (chartData.error) {
            return res.status(404).json(chartData);
        }
        res.json(chartData);
    } catch (error) {
        console.error(`Error fetching chart data for ${symbol}:`, error);
        res.status(500).json({ error: true, message: 'Internal server error.' });
    }
});

server.listen(port, () => {
    console.log(`🚀 Chatbot server is running on port ${port}`);
    console.log(`📱 Open http://localhost:${port} to access the chat interface`);
    console.log(`🤖 Available models: ${Object.keys(availableModels).join(', ')}`);
});