/**
 * Utilitaires de logging côté client pour SIGMA
 * 
 * Ce fichier contient des fonctions pour faciliter le logging
 * depuis le client vers Google Cloud Operations (Stackdriver)
 */

// Vérifier que nous sommes bien dans l'environnement navigateur
// pour éviter les erreurs d'exécution côté serveur
if (typeof document !== 'undefined') {
  // File d'attente pour les logs quand la connexion est perdue
  const logQueue = [];

  // État de la connexion au serveur
  let isConnected = true;

  // Limite de taille pour la file d'attente
  const MAX_QUEUE_SIZE = 100;
  
  // Initialiser le système de logging quand le document est prêt
  document.addEventListener('DOMContentLoaded', initLogging);
}

/**
 * Log une information
 * @param {string} message - Message à logger
 * @param {Object} data - Données supplémentaires à logger (optionnel)
 */
function logInfo(message, data = null) {
  // Log dans la console du navigateur
  if (typeof console !== 'undefined') {
    console.log(`[INFO] ${message}`, data || '');
  }
  
  // Envoyer au serveur si en environnement client
  if (typeof document !== 'undefined') {
    _log('INFO', message, data);
  }
}

/**
 * Log un avertissement
 * @param {string} message - Message à logger
 * @param {Object} data - Données supplémentaires à logger (optionnel)
 */
function logWarning(message, data = null) {
  // Log dans la console du navigateur
  if (typeof console !== 'undefined') {
    console.warn(`[WARNING] ${message}`, data || '');
  }
  
  // Envoyer au serveur si en environnement client
  if (typeof document !== 'undefined') {
    _log('WARNING', message, data);
  }
}

/**
 * Log une erreur
 * @param {string} message - Message à logger
 * @param {Error|Object} error - Objet d'erreur ou données supplémentaires
 */
function logError(message, error = null) {
  // Log dans la console du navigateur
  if (typeof console !== 'undefined') {
    console.error(`[ERROR] ${message}`, error || '');
  }
  
  // Envoyer au serveur si en environnement client
  if (typeof document !== 'undefined') {
    let data = null;
    
    // Si l'erreur est un objet Error, extraire les informations pertinentes
    if (error instanceof Error) {
      data = {
        name: error.name,
        message: error.message,
        stack: error.stack
      };
    } else if (error !== null) {
      data = error;
    }
    
    _log('ERROR', message, data);
  }
}

/**
 * Fonction interne pour envoyer un log au serveur
 * Cette fonction n'est exécutée que dans l'environnement client
 * @param {string} level - Niveau de log (INFO, WARNING, ERROR)
 * @param {string} message - Message à logger
 * @param {Object} data - Données supplémentaires à logger
 */
function _log(level, message, data) {
  // Vérifier que nous sommes bien dans l'environnement navigateur
  if (typeof document === 'undefined') return;
  
  // Créer l'objet de log
  const logEntry = {
    level: level,
    message: message,
    data: data,
    timestamp: new Date().toISOString(),
    url: window.location.href,
    userAgent: navigator.userAgent
  };
  
  // Si la connexion est active, envoyer directement
  if (isConnected) {
    _sendLogToServer(logEntry);
  } else {
    // Sinon, ajouter à la file d'attente
    _enqueueLog(logEntry);
  }
}

/**
 * Envoie un log au serveur
 * @param {Object} logEntry - Entrée de log à envoyer
 */
function _sendLogToServer(logEntry) {
  google.script.run
    .withSuccessHandler(function() {
      // Si la connexion était considérée comme perdue, la rétablir
      if (!isConnected) {
        isConnected = true;
        _processPendingLogs();
      }
    })
    .withFailureHandler(function(error) {
      isConnected = false;
      // En cas d'échec, mettre le log en file d'attente
      _enqueueLog(logEntry);
      console.error('Erreur d\'envoi de log au serveur:', error);
    })
    .logFromClient(logEntry.level, logEntry.message, logEntry.data);
}

/**
 * Ajoute un log à la file d'attente
 * @param {Object} logEntry - Entrée de log à mettre en file d'attente
 */
function _enqueueLog(logEntry) {
  // Vérifier que nous sommes bien dans l'environnement navigateur
  if (typeof document === 'undefined') return;
  
  // Limiter la taille de la file d'attente
  if (logQueue.length >= MAX_QUEUE_SIZE) {
    // Supprimer l'entrée la plus ancienne
    logQueue.shift();
  }
  
  logQueue.push(logEntry);
  
  // Stocker la file d'attente dans le localStorage pour persistance
  try {
    localStorage.setItem('SIGMA_LOG_QUEUE', JSON.stringify(logQueue));
  } catch (e) {
    // En cas d'erreur (ex: localStorage plein), simplement continuer
    console.error('Erreur lors du stockage des logs en attente:', e);
  }
}

/**
 * Traite les logs en attente
 */
function _processPendingLogs() {
  // Vérifier que nous sommes bien dans l'environnement navigateur
  if (typeof document === 'undefined') return;
  
  // Récupérer d'éventuels logs stockés dans localStorage
  try {
    const storedLogs = localStorage.getItem('SIGMA_LOG_QUEUE');
    if (storedLogs) {
      const parsedLogs = JSON.parse(storedLogs);
      
      // Fusionner avec la file d'attente en mémoire
      while (parsedLogs.length > 0) {
        const oldLog = parsedLogs.shift();
        if (logQueue.indexOf(oldLog) === -1) {
          logQueue.push(oldLog);
        }
      }
      
      // Effacer le stockage
      localStorage.removeItem('SIGMA_LOG_QUEUE');
    }
  } catch (e) {
    console.error('Erreur lors de la récupération des logs stockés:', e);
  }
  
  // Traiter les logs en attente
  while (logQueue.length > 0 && isConnected) {
    const logEntry = logQueue.shift();
    _sendLogToServer(logEntry);
  }
}

/**
 * Initialise le système de logging
 */
function initLogging() {
  // Vérifier que nous sommes bien dans l'environnement navigateur
  if (typeof document === 'undefined') return;
  
  // Traiter les logs en attente au démarrage
  _processPendingLogs();
  
  // Gérer les événements de connexion
  window.addEventListener('online', function() {
    isConnected = true;
    _processPendingLogs();
  });
  
  window.addEventListener('offline', function() {
    isConnected = false;
  });
  
  logInfo('Système de logging initialisé');
}
