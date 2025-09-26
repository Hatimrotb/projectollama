// WebSearch.js
const fetch = require('node-fetch');

class WebSearch {
    constructor() {
        // Using SearXNG public instance - no API key needed, real web search results
        this.baseUrl = 'https://searx.be/search';
        console.log("🔍 WebSearch initialized with SearXNG (real web search)");
    }

    /**
     * Performs a real web search using SearXNG
     * @param {string} query The search query.
     * @returns {Promise<string>} A formatted string of search results for the LLM.
     */
    async search(query) {
        console.log(`🔍 Performing web search for: ${query}`);
        try {
            // Use SearXNG for real web search results
            const url = `${this.baseUrl}?q=${encodeURIComponent(query)}&format=json&engines=google,bing&safesearch=1`;
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            return this.formatResultsForLLM(data, query);

        } catch (error) {
            console.error("❌ Error in WebSearch:", error.message);
            return `Error performing web search: ${error.message}`;
        }
    }

    /**
     * Formats the SearXNG response into a clean string for the LLM.
     * @param {object} data The JSON response from SearXNG.
     * @param {string} query The original query.
     * @returns {string} A formatted string.
     */
    formatResultsForLLM(data, query) {
        let formattedResults = "";

        // Check if we have search results
        if (data.results && data.results.length > 0) {
            formattedResults += `Résultats de recherche pour "${query}":\n\n`;
            
            // Get top 5 results
            const topResults = data.results.slice(0, 5);
            
            topResults.forEach((result, index) => {
                formattedResults += `${index + 1}. **${result.title}**\n`;
                if (result.content) {
                    // Clean and truncate content
                    let content = result.content.replace(/<[^>]*>/g, '').trim();
                    if (content.length > 200) {
                        content = content.substring(0, 200) + '...';
                    }
                    formattedResults += `   ${content}\n`;
                }
                if (result.url) {
                    formattedResults += `   Source: ${result.url}\n`;
                }
                formattedResults += '\n';
            });
            
            // Add summary
            formattedResults += `\nBasé sur ${data.results.length} résultats trouvés.`;
            
        } else {
            formattedResults = `Aucun résultat trouvé pour "${query}". Essayez avec des mots-clés différents.`;
        }

        return formattedResults;
    }
}

module.exports = WebSearch;
