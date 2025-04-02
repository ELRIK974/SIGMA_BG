/**
 * Point d'entrée principal de l'application SIGMA
 * 
 * Ce fichier contient:
 * - La fonction doGet qui génère l'interface utilisateur
 * - La fonction include pour intégrer des fichiers HTML
 * - La gestion sécurisée de la configuration Firebase via Properties Service
 */

/**
 * Fonction principale qui génère l'interface web
 * @param {Object} e - Paramètres de la requête (optionnels)
 * @return {HtmlOutput} Interface HTML à afficher
 */
function doGet(e) {
  // Vérifier si l'application est en mode maintenance
  if (isMaintenanceMode()) {
    return HtmlService.createTemplateFromFile('html/maintenance')
      .evaluate()
      .setTitle('SIGMA - Maintenance')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }
  
  // Page à afficher (par défaut: index)
  let page = 'index';
  
  // Vérifier si une page spécifique est demandée
  if (e && e.parameter && e.parameter.page) {
    // Valider le paramètre pour éviter les injections
    const requestedPage = e.parameter.page.replace(/[^a-zA-Z0-9_-]/g, '');
    
    // Vérifier si la page demandée existe
    try {
      // Tenter de récupérer le fichier pour vérifier s'il existe
      HtmlService.createTemplateFromFile(`html/${requestedPage}`);
      page = requestedPage;
    } catch (error) {
      // Si la page n'existe pas, conserver la page par défaut
      console.error(`Page demandée non trouvée: ${requestedPage}`, error);
    }
  }
  
  // Log pour le suivi des accès (utile pour le debugging et statistiques)
  console.log(`Accès à l'application - Page: ${page}`);
  
  // Créer et retourner la page HTML
  return HtmlService.createTemplateFromFile(`html/${page}`)
    .evaluate()
    .setTitle('SIGMA - Système Informatique de Gestion du Matériel')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Fonction pour inclure des fichiers HTML
 * @param {string} filename - Nom du fichier à inclure
 * @return {string} Contenu du fichier
 */
function include(filename) {
  try {
    return HtmlService.createHtmlOutputFromFile(filename).getContent();
  } catch (error) {
    console.error(`Erreur lors de l'inclusion du fichier ${filename}:`, error);
    return `<!-- Erreur: Impossible d'inclure le fichier ${filename} -->`;
  }
}

/**
 * Vérifie si l'application est en mode maintenance
 * @return {boolean} True si le mode maintenance est activé
 */
function isMaintenanceMode() {
  try {
    const maintenanceMode = PropertiesService.getScriptProperties().getProperty('MAINTENANCE_MODE');
    return maintenanceMode === 'true';
  } catch (error) {
    console.error('Erreur lors de la vérification du mode maintenance:', error);
    return false; // Par défaut, ne pas bloquer l'accès en cas d'erreur
  }
}

/**
 * Récupère la configuration Firebase de manière sécurisée
 * Les clés API sont stockées dans Script Properties plutôt qu'en dur dans le code
 * @return {Object} Configuration Firebase
 */
function getFirebaseConfig() {
  try {
    const scriptProperties = PropertiesService.getScriptProperties();
    
    // Récupérer les propriétés individuellement (plus sécurisé que getProperties())
    const config = {
      apiKey: scriptProperties.getProperty('FIREBASE_API_KEY'),
      authDomain: scriptProperties.getProperty('FIREBASE_AUTH_DOMAIN'),
      projectId: scriptProperties.getProperty('FIREBASE_PROJECT_ID'),
      storageBucket: scriptProperties.getProperty('FIREBASE_STORAGE_BUCKET'),
      messagingSenderId: scriptProperties.getProperty('FIREBASE_MESSAGING_SENDER_ID'),
      appId: scriptProperties.getProperty('FIREBASE_APP_ID')
    };
    
    // Vérifier que toutes les propriétés nécessaires sont définies
    for (const [key, value] of Object.entries(config)) {
      if (!value) {
        console.error(`Propriété Firebase manquante: ${key}`);
        // Ne pas lancer d'erreur pour éviter de bloquer le chargement, mais logger l'erreur
      }
    }
    
    return config;
  } catch (error) {
    console.error('Erreur lors de la récupération de la configuration Firebase:', error);
    
    // En cas d'erreur, retourner un objet vide plutôt que null pour éviter les erreurs client
    return {
      apiKey: '',
      authDomain: '',
      projectId: '',
      storageBucket: '',
      messagingSenderId: '',
      appId: ''
    };
  }
}

/**
 * Configure les propriétés du script pour Firebase (à exécuter une seule fois)
 * Cette fonction est utile pour initialiser les propriétés lors de la configuration
 * @param {Object} config - Configuration Firebase
 */
function setFirebaseConfig(config) {
  try {
    const scriptProperties = PropertiesService.getScriptProperties();
    
    // Définir chaque propriété individuellement
    scriptProperties.setProperty('FIREBASE_API_KEY', config.apiKey || '');
    scriptProperties.setProperty('FIREBASE_AUTH_DOMAIN', config.authDomain || '');
    scriptProperties.setProperty('FIREBASE_PROJECT_ID', config.projectId || '');
    scriptProperties.setProperty('FIREBASE_STORAGE_BUCKET', config.storageBucket || '');
    scriptProperties.setProperty('FIREBASE_MESSAGING_SENDER_ID', config.messagingSenderId || '');
    scriptProperties.setProperty('FIREBASE_APP_ID', config.appId || '');
    
    return true;
  } catch (error) {
    console.error('Erreur lors de la configuration des propriétés Firebase:', error);
    return false;
  }
}
