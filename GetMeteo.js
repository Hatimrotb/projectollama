// GetMeteo.js
const fetch = require('node-fetch'); // Assurez-vous d'avoir node-fetch: npm install node-fetch@2

class GetMeteo {
    constructor(apiKey) {
        if (!apiKey) {
            throw new Error("La clé API pour le service météo est manquante !");
        }
        this.apiKey = apiKey;
        this.baseUrl = 'https://api.openweathermap.org/data/2.5/weather';
    }

    /**
     * Récupère la météo actuelle pour une ville donnée.
     * @param {string} city Le nom de la ville.
     * @returns {Promise<object>} Un objet contenant les données météo simplifiées.
     */
    async getCurrentWeather(city) {
        console.log(`🌦️  Récupération de la météo pour : ${city}`);
        const url = `${this.baseUrl}?q=${city}&appid=${this.apiKey}&units=metric&lang=fr`;

        try {
            const response = await fetch(url);
            if (!response.ok) {
                if (response.status === 404) {
                    throw new Error(`La ville "${city}" n'a pas été trouvée.`);
                } else {
                    throw new Error(`Erreur API météo: ${response.statusText}`);
                }
            }
            const data = await response.json();

            // On retourne un objet simple et utile
            return {
                city: data.name,
                country: data.sys.country,
                temperature: data.main.temp,
                feels_like: data.main.feels_like,
                description: data.weather[0].description,
                icon: data.weather[0].icon
            };
        } catch (error) {
            console.error("❌ Erreur dans GetMeteo:", error.message);
            // Renvoyer une erreur que le chatbot pourra interpréter
            return { error: true, message: error.message };
        }
    }
}

module.exports = GetMeteo;