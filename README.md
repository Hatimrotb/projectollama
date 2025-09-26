# 🤖 Ollama Chatbot Interface

Une interface de chat moderne avec intégration d'outils externes (météo, recherche web, finance) utilisant Ollama comme modèle de langage.

## ✨ Fonctionnalités

- 💬 **Chat en temps réel** avec modèles Ollama
- 🌤️ **Module Météo** - Informations météorologiques actuelles
- 🔍 **Recherche Web** - Résultats de recherche en temps réel
- 📊 **Module Finance** - Données boursières et graphiques interactifs
- 🎨 **Interface moderne** avec Bootstrap et animations
- 🔄 **Changement de modèles** à la volée

## 🚀 Installation et Démarrage

### 1. Prérequis
- **Node.js** (version 14 ou supérieure)
- **Ollama** installé et en cours d'exécution
- Connexion Internet pour les APIs externes

### 2. Installation
```bash
# Cloner le projet
git clone <votre-repo>
cd OllamaChatbot11

# Installer les dépendances
npm install
```

### 3. Configuration
Créer un fichier `.env` à la racine du projet :
```env
OPENWEATHER_API_KEY=votre_cle_openweather
FINNHUB_API_KEY=votre_cle_finnhub
```

**Obtenir les clés API :**
- **OpenWeather** : [openweathermap.org](https://openweathermap.org/api) (gratuit)
- **Finnhub** : [finnhub.io](https://finnhub.io/) (gratuit, 60 appels/min)

### 4. Démarrage
```bash
# Démarrer le serveur
npm start
```

### 5. Accès
Ouvrir votre navigateur à l'adresse : **http://localhost:3000**

## 🛠️ Utilisation

### Chat Principal
- Tapez vos messages dans la zone de texte
- Le chatbot détecte automatiquement les demandes d'outils
- Changez de modèle avec le sélecteur en haut

### Modules Externes

#### 🌤️ Météo
- **Toggle ON/OFF** dans l'en-tête
- **Module dédié** : Tapez une ville et cliquez "Get Weather"
- **Dans le chat** : "Quel temps fait-il à Paris ?"

#### 🔍 Recherche Web
- **Toggle ON/OFF** dans l'en-tête
- **Dans le chat** : "Recherche les dernières nouvelles sur..."
- Résultats avec titres, extraits et sources

#### 📊 Finance
- **Toggle ON/OFF** dans l'en-tête
- **Module dédié** : Tapez un symbole (AAPL, TSLA, etc.)
- **Market Overview** : Aperçu des grandes entreprises
- **Graphiques** : Cliquez "Show Chart" après une recherche
- **Dans le chat** : "Prix de l'action Apple"

## 🔧 Structure du Projet

```bash
OllamaChatbot11/
├── server.js              # Serveur Express principal
├── MyChatterBot.js        # Logique du chatbot
├── GetMeteo.js           # Service météo
├── WebSearch.js          # Service recherche web
├── FinanceService.js     # Service finance
├── public/
│   └── index.html        # Interface utilisateur
├── package.json          # Dépendances
└── .env                  # Variables d'environnement
```

## 🌐 APIs Utilisées

- **Ollama** : Modèles de langage locaux
- **OpenWeatherMap** : Données météorologiques
- **SearXNG** : Recherche web (pas de clé requise)
- **Finnhub** : Données financières
- **Chart.js** : Graphiques interactifs

## 🚨 Dépannage

### Problèmes courants :

1. **"Ollama not responding"**
   - Vérifiez qu'Ollama est démarré : `ollama serve`
   - Vérifiez les modèles installés : `ollama list`

2. **Erreurs API**
   - Vérifiez vos clés API dans le fichier `.env`
   - Vérifiez votre connexion Internet

3. **Port déjà utilisé**
   - Changez le port dans `server.js` (ligne ~15)
   - Ou arrêtez le processus : `netstat -ano | findstr :3000`

## 📝 Commandes Utiles

```bash
# Démarrer le serveur
npm start

# Installer une nouvelle dépendance
npm install <package-name>

# Vérifier les modèles Ollama
ollama list

# Télécharger un nouveau modèle
ollama pull llama4
```

## 🎯 Prochaines Améliorations

- [ ] Données historiques réelles pour les graphiques
- [ ] Sauvegarde des conversations
- [ ] Thèmes personnalisables
- [ ] Support multilingue
- [ ] Notifications push
