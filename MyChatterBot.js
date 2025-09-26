const { Ollama } = require('ollama');

class MyChatterBot {
    constructor(model, meteoService, webSearchService, financeService) {
        console.log("🤖 Initializing custom Ollama interface with model: " + model);
        this.model = model;
        this.ollama_host = "localhost";
        this.ollama_port = 11434;

        this.messages = [];
        this.meteoService = meteoService;
        this.webSearchService = webSearchService;
        this.financeService = financeService;
        this.webSearchEnabled = false; // Default to disabled
        this.financeEnabled = false; // Default to disabled
        
       
        this.ollama = new Ollama({ 
            host: `http://${this.ollama_host}:${this.ollama_port}` 
        });
    }


    

    async chat(prompt, options = {}) {
        this.messages.push({ role: 'user', content: prompt });
        
        // Update web search status if provided
        if (options.webSearchEnabled !== undefined) {
            this.webSearchEnabled = options.webSearchEnabled;
        }
        
        // Update finance status if provided
        if (options.financeEnabled !== undefined) {
            this.financeEnabled = options.financeEnabled;
        }

        
        try {
            
            const systemPromptForToolUse = `
            Tu es un assistant. Analyse la demande de l'utilisateur. 
            - Si la demande de l'utilisateur concerne la météo pour une ville spécifique (par exemple, "quel temps fait-il à Lyon ?"), tu dois répondre SEULEMENT avec un objet JSON au format: {"tool": "get_weather", "city": "nom_de_la_ville"}.
            ${this.webSearchEnabled ? '- Si la demande concerne une recherche web, des informations actuelles, des nouvelles, des définitions, ou tout sujet nécessitant une recherche (par exemple, "cherche dans le web", "dernières nouvelles", "what is", "define"), tu dois répondre SEULEMENT avec un objet JSON au format: {"tool": "web_search", "query": "termes de recherche appropriés"}.': ''}
            ${this.financeEnabled ? '- Si la demande concerne la finance, les actions, le marché boursier, ou des symboles financiers (par exemple, "prix de l\'action Apple", "cours de AAPL", "marché financier"), tu dois répondre SEULEMENT avec un objet JSON au format: {"tool": "get_stock", "symbol": "SYMBOLE"}.': ''}
            - Pour toute autre question ou salutation (comme "bonjour", "qui es-tu ?"), tu dois répondre comme un assistant normal, en texte clair, SANS utiliser de JSON.
            
            IMPORTANT: Quand tu génères un JSON, assure-toi qu'il soit valide et complet.
            `;

           
            const weatherKeywords = ['météo', 'meteo', 'temps', 'temperature', 'weather'];
            const searchKeywords = ['news', 'nouvelles', 'actualités', 'dernières', 'récent', 'aujourd\'hui', 'current', 'latest', 'recent', 'last', 'cherche', 'search', 'web', 'what is', 'define', 'explain', 'tell me', 'mise à jour', 'information'];
            const financeKeywords = ['action', 'stock', 'bourse', 'marché', 'finance', 'cours', 'prix', 'nasdaq', 'sp500', 'dow', 'trading', 'investissement', 'portfolio'];
            
            const useJsonFormat = weatherKeywords.some(keyword => prompt.toLowerCase().includes(keyword)) || 
                                 (this.webSearchEnabled && searchKeywords.some(keyword => prompt.toLowerCase().includes(keyword))) ||
                                 (this.financeEnabled && financeKeywords.some(keyword => prompt.toLowerCase().includes(keyword)));

            const requestPayload = {
                model: this.model,
                messages: [
                    { role: 'system', content: systemPromptForToolUse },
                    ...this.messages // Include the whole conversation history
                ],
                stream: false
            };

            if (useJsonFormat) {
                requestPayload.format = 'json';
                console.log("🌦️  Mots-clés météo détectés, activation du mode JSON.");
            }

            const decisionResponse = await this.ollama.chat(requestPayload);

            const decisionContent = decisionResponse.message.content;
            let toolCall = null;
            const jsonRegex = /\{.*\}/s;
            const jsonMatch = decisionContent.match(jsonRegex);

            if (jsonMatch) {
                try {
                    toolCall = JSON.parse(jsonMatch[0]);
                    console.log("🔧 JSON extrait et parsé avec succès.");
                } catch (e) {
                    console.warn("⚠️ JSON détecté mais invalide. Traitement comme texte.", e);
                }
            }

            if (toolCall && toolCall.tool === 'get_weather') {
                console.log(`🔧 Outil détecté : Météo pour la ville de ${toolCall.city}`);
                
                
                const weatherData = await this.meteoService.getCurrentWeather(toolCall.city);

                if (weatherData.error) {
                    const errorMessage = `Désolé, je n'ai pas pu récupérer la météo : ${weatherData.message}`;
                    this.messages.push({ role: 'assistant', content: errorMessage });
                    return errorMessage;
                }

                
                const finalPrompt = `
                L'utilisateur a demandé : "${prompt}".
                J'ai récupéré ces données météo : ${JSON.stringify(weatherData)}.
                Formule une réponse naturelle, amicale et concise et avec emojis en français pour l'utilisateur.
                Par exemple: "Actuellement à Lyon, le ciel est dégagé et il fait 19.5°C."
                `;
                
              
                const finalResponse = await this.ollama.chat({
                    model: this.model,
                    messages: [
                        ...this.messages,
                        { role: 'assistant', content: `Ok, je vais chercher la météo pour ${toolCall.city}.` },
                        { role: 'user', content: finalPrompt }
                    ],
                    stream: false
                });

                const finalAnswer = finalResponse.message.content;
                this.messages.push({ role: 'assistant', content: finalAnswer });

                // Renvoyer un objet structuré pour la météo
                return {
                    type: 'weather',
                    text: finalAnswer,
                    data: weatherData
                }; 
            } else if (toolCall && toolCall.tool === 'web_search' && this.webSearchEnabled) {
                console.log(`🔍 Outil détecté : Recherche web pour "${toolCall.query}"`);
                
                // Perform web search
                const searchResults = await this.webSearchService.search(toolCall.query);
                
                // Generate final response using search results
                const finalPrompt = `
                L'utilisateur a demandé : "${prompt}".
                J'ai effectué une recherche web et voici les résultats :
                ${searchResults}
                
                Formule une réponse naturelle, informative et concise en français pour l'utilisateur en te basant sur ces informations.
                `;
                
                const finalResponse = await this.ollama.chat({
                    model: this.model,
                    messages: [
                        ...this.messages,
                        { role: 'assistant', content: `Je vais rechercher des informations sur "${toolCall.query}".` },
                        { role: 'user', content: finalPrompt }
                    ],
                    stream: false
                });

                const finalAnswer = finalResponse.message.content;
                this.messages.push({ role: 'assistant', content: finalAnswer });
                return finalAnswer;
            } else if (toolCall && toolCall.tool === 'get_stock' && this.financeEnabled) {
                console.log(`💹 Outil détecté : Finance pour le symbole "${toolCall.symbol}"`);
                
                // Get stock data
                const stockData = await this.financeService.getStockQuote(toolCall.symbol);
                
                if (stockData.error) {
                    const errorMessage = `Désolé, je n'ai pas pu récupérer les données financières : ${stockData.message}`;
                    this.messages.push({ role: 'assistant', content: errorMessage });
                    return errorMessage;
                }
                
                // Generate final response using stock data
                const finalPrompt = `
                L'utilisateur a demandé : "${prompt}".
                J'ai récupéré ces données financières : ${JSON.stringify(stockData)}.
                Formule une réponse naturelle, informative et concise en français pour l'utilisateur avec des emojis appropriés.
                Par exemple: "L'action ${stockData.symbol} se négocie actuellement à ${stockData.price}$ avec une variation de ${stockData.changePercent}%."
                `;
                
                const finalResponse = await this.ollama.chat({
                    model: this.model,
                    messages: [
                        ...this.messages,
                        { role: 'assistant', content: `Je vais chercher les données financières pour ${toolCall.symbol}.` },
                        { role: 'user', content: finalPrompt }
                    ],
                    stream: false
                });

                const finalAnswer = finalResponse.message.content;
                this.messages.push({ role: 'assistant', content: finalAnswer });

                // Return structured finance object for frontend
                return {
                    type: 'finance',
                    text: finalAnswer,
                    data: stockData
                };
            } else {
                // If no valid tool call was made, treat the whole response as a direct answer.
                console.log("✅ Réponse directe (pas d'appel d'outil valide).");
                this.messages.push({ role: 'assistant', content: decisionContent });
                return decisionContent;
            }

        } catch (error) {
            console.error(`❌ Erreur dans la méthode chat :`, error);
            this.messages.pop(); 
            
            throw new Error("Désolé, une erreur est survenue lors du traitement de votre demande.");
        }
    
    }

   
    async isModelAvailable() {
        try {
            const models = await this.ollama.list();
            return models.models.some(model => model.name === this.model || model.name.startsWith(this.model));
        } catch (error) {
            console.error("Error checking available models:", error);
            return false;
        }
    }

 
    async getModelInfo() {
        try {
            const info = await this.ollama.show({ model: this.model });
            return info;
        } catch (error) {
            console.error(`Error getting info for model ${this.model}:`, error);
            return null;
        }
    }

    
    async getAvailableModels() {
        try {
            const result = await this.ollama.list();
            return result.models.map(model => ({
                name: model.name,
                size: model.size,
                modified_at: model.modified_at
            }));
        } catch (error) {
            console.error("Error listing models:", error);
            return [];
        }
    }
}

module.exports = MyChatterBot;