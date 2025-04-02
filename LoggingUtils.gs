/**
 * Utilitaires de logging pour SIGMA (côté serveur)
 * 
 * Ce fichier contient des fonctions pour faciliter le logging
 * vers Google Cloud Operations (Stackdriver)
 */

/**
 * Log une information
 * @param {string} message - Message à logger
 * @param {Object} data - Données supplémentaires à logger (optionnel)
 */
function logInfo(message, data = null) {
  _logWithLevel('INFO', message, data);
}

/**
 * Log un avertissement
 * @param {string} message - Message à logger
 * @param {Object} data - Données supplémentaires à logger (optionnel)
 */
function logWarning(message, data = null) {
  _logWithLevel('WARNING', message, data);
}

/**
 * Log une erreur
 * @param {string} message - Message à logger
 * @param {Error|Object} error - Objet d'erreur ou données supplémentaires
 */
function logError(message, error = null) {
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
  
  _logWithLevel('ERROR', message, data);
}

/**
 * Fonction interne pour logger avec un niveau spécifique
 * @param {string} level - Niveau de log (INFO, WARNING, ERROR)
 * @param {string} message - Message à logger
 * @param {Object} data - Données supplémentaires à logger
 */
function _logWithLevel(level, message, data) {
  // Créer l'objet de log structuré
  const logObject = {
    level: level,
    message: message,
    timestamp: new Date().toISOString(),
    application: 'SIGMA'
  };
  
  // Ajouter les données supplémentaires si présentes
  if (data) {
    logObject.data = data;
  }
  
  // Ajouter des informations sur l'utilisateur actif si disponible
  try {
    const user = Session.getActiveUser().getEmail();
    if (user) {
      logObject.user = user;
    }
  } catch (e) {
    // Ignorer les erreurs sur la récupération de l'utilisateur
  }
  
  // Logger vers Cloud Logging (Stackdriver)
  // Le niveau détermine la méthode à utiliser
  const logJson = JSON.stringify(logObject);
  
  if (level === 'ERROR') {
    console.error(logJson);
  } else if (level === 'WARNING') {
    console.warn(logJson);
  } else {
    console.log(logJson);
  }
}

/**
 * Fonction exposée pour permettre au client de logger
 * @param {string} level - Niveau de log (INFO, WARNING, ERROR)
 * @param {string} message - Message à logger
 * @param {Object} data - Données supplémentaires à logger (optionnel)
 */
function logFromClient(level, message, data = null) {
  // Vérifier que le niveau est valide
  const validLevels = ['INFO', 'WARNING', 'ERROR'];
  if (!validLevels.includes(level)) {
    level = 'INFO'; // Niveau par défaut
  }
  
  // Ajouter une indication que le log vient du client
  const enhancedData = data ? { ...data, source: 'client' } : { source: 'client' };
  
  // Utiliser la fonction interne de logging
  _logWithLevel(level, message, enhancedData);
  
  return true;
}
