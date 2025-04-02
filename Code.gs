/**
 * Configure les propriétés du script pour Firebase (à exécuter une seule fois)
 * Cette fonction est utile pour initialiser les propriétés lors de la configuration
 * @param {Object} config - Configuration Firebase
 * @return {boolean} true si la configuration a réussi, false sinon
 */
function setupFirebaseConfig() {
  // Objet de configuration Firebase complet
  var firebaseConfig = {
    apiKey: "AIzaSyCwMFmQNCOf7LHA2iKKMrU77kIM2rAvC9w",
    authDomain: "sigma-nova.firebaseapp.com", 
    databaseURL: "https://sigma-nova-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "sigma-nova",
    storageBucket: "sigma-nova.firebasestorage.app", 
    messagingSenderId: "421595462220", 
    appId: "1:421595462220:web:d69ac8eb028c01ee4512e"
  };
  
  // Fonction pour enregistrer la configuration
  try {
    var scriptProperties = PropertiesService.getScriptProperties();
    
    // Définir chaque propriété individuellement
    scriptProperties.setProperty('FIREBASE_API_KEY', firebaseConfig.apiKey);
    scriptProperties.setProperty('FIREBASE_AUTH_DOMAIN', firebaseConfig.authDomain);
    scriptProperties.setProperty('FIREBASE_PROJECT_ID', firebaseConfig.projectId);
    scriptProperties.setProperty('FIREBASE_STORAGE_BUCKET', firebaseConfig.storageBucket);
    scriptProperties.setProperty('FIREBASE_MESSAGING_SENDER_ID', firebaseConfig.messagingSenderId);
    scriptProperties.setProperty('FIREBASE_APP_ID', firebaseConfig.appId);
    
    if (firebaseConfig.databaseURL) {
      scriptProperties.setProperty('FIREBASE_DATABASE_URL', firebaseConfig.databaseURL);
    }
    
    console.log('Configuration Firebase enregistrée avec succès');
    return "Configuration enregistrée avec succès";
  } catch (error) {
    console.error('Erreur lors de la configuration:', error);
    return "Erreur: " + error;
  }
}

/**
 * Fonction pour initialiser rapidement la configuration
 */
function setupInitialConfig() {
  const config = {
    apiKey: "AIzaSyCwMFmQNCOf7LHA2iKKMrU77kIM2rAvC9w",
    authDomain: "sigma-nova.firebaseapp.com", 
    databaseURL: "https://sigma-nova-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "sigma-nova",
    storageBucket: "sigma-nova.firebasestorage.app", 
    messagingSenderId: "421595462220", 
    appId: "1:421595462220:web:d69ac8eb028c01ee4512e"
  };
  
  const result = setFirebaseConfig(config);
  console.log("Configuration Firebase enregistrée:", result);
  return result;
}