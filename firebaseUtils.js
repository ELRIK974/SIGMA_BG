/**
 * Utilitaires Firebase pour SIGMA
 * 
 * Ce fichier contient toutes les fonctions d'interaction avec Firebase:
 * - Initialisation
 * - Opérations CRUD sur Firestore
 * - Gestion de l'authentification
 * - Appels aux Cloud Functions
 */

// Variables globales pour les instances Firebase
let firebaseApp;
let firestoreDB;
let auth;
let functions;
let storage;

// État d'initialisation de Firebase
let firebaseInitialized = false;
let initializationPromise = null;

/**
 * Vérifie si les émulateurs Firebase doivent être utilisés
 * @return {boolean} True si les émulateurs doivent être utilisés
 */
function shouldUseEmulators() {
  // Vérifier en priorité dans le localStorage
  try {
    const localSetting = localStorage.getItem('SIGMA_USE_EMULATORS');
    if (localSetting === 'true') {
      return true;
    } else if (localSetting === 'false') {
      return false;
    }
    // Si pas de valeur dans localStorage, la configuration serveur sera utilisée
  } catch (e) {
    // Si localStorage n'est pas disponible, ignorer l'erreur
  }
  
  // La décision finale sera prise selon la configuration serveur
  return false;
}

/**
 * Configure les émulateurs Firebase pour les tests locaux
 * @param {Object} config - Configuration incluant les paramètres des émulateurs
 */
function setupEmulators(config) {
  if (!config.emulators) {
    logWarning('Configuration des émulateurs manquante');
    return;
  }
  
  logInfo('Configuration des émulateurs Firebase en cours...');
  
  // Configurer l'émulateur Firestore
  if (config.emulators.firestore && firestoreDB) {
    firestoreDB.useEmulator(
      config.emulators.firestore.host,
      config.emulators.firestore.port
    );
    logInfo(`Émulateur Firestore configuré: ${config.emulators.firestore.host}:${config.emulators.firestore.port}`);
  }
  
  // Configurer l'émulateur Auth
  if (config.emulators.auth && auth) {
    auth.useEmulator(`http://${config.emulators.auth.host}:${config.emulators.auth.port}`);
    logInfo(`Émulateur Auth configuré: ${config.emulators.auth.host}:${config.emulators.auth.port}`);
  }
  
  // Configurer l'émulateur Functions
  if (config.emulators.functions && functions) {
    functions.useEmulator(
      config.emulators.functions.host,
      config.emulators.functions.port
    );
    logInfo(`Émulateur Functions configuré: ${config.emulators.functions.host}:${config.emulators.functions.port}`);
  }
  
  // Configurer l'émulateur Storage
  if (config.emulators.storage && storage) {
    storage.useEmulator(
      config.emulators.storage.host,
      config.emulators.storage.port
    );
    logInfo(`Émulateur Storage configuré: ${config.emulators.storage.host}:${config.emulators.storage.port}`);
  }
  
  logInfo('Configuration des émulateurs Firebase terminée');
}

/**
 * Initialise Firebase avec la configuration obtenue du serveur
 * @return {Promise} Promesse résolue quand Firebase est initialisé
 */
function initFirebase() {
  // Utilisez une promesse pour gérer l'initialisation asynchrone
  if (initializationPromise) {
    return initializationPromise; // Ne pas réinitialiser si déjà en cours
  }
  
  initializationPromise = new Promise((resolve, reject) => {
    if (firebaseInitialized) {
      // Déjà initialisé
      resolve();
      return;
    }
    
    // Déterminer si les émulateurs doivent être utilisés
    const useEmulators = shouldUseEmulators();
    
    // Appel au serveur pour obtenir la configuration
    google.script.run
      .withSuccessHandler(function(config) {
        try {
          // Vérifier que la configuration est valide
          if (!config || !config.apiKey || !config.projectId) {
            throw new Error('Configuration Firebase invalide ou incomplète');
          }
          
          // Initialiser Firebase
          firebaseApp = firebase.initializeApp(config);
          
          // Initialiser Firestore avec les paramètres optimaux
          firestoreDB = firebase.firestore();
          
          // Configurer la persistance hors ligne (utile pour la résilience)
          firestoreDB.enablePersistence({ synchronizeTabs: true })
            .catch(function(err) {
              // Ces erreurs sont normales dans certains contextes
              if (err.code === 'failed-precondition') {
                // Plusieurs onglets ouverts, la persistance ne peut fonctionner que dans un seul
                logWarning('Persistance Firestore limitée - plusieurs onglets ouverts');
              } else if (err.code === 'unimplemented') {
                // Le navigateur ne supporte pas la persistance
                logWarning('Persistance Firestore non supportée par ce navigateur');
              } else {
                logError('Erreur lors de l\'activation de la persistance Firestore', err);
              }
            });
          
          // Initialiser Auth
          auth = firebase.auth();
          
          // Initialiser Functions avec la région correcte
          functions = firebase.functions();
          
          // Si un emplacement régional est spécifié
          if (config.functionsRegion) {
            functions.useRegion(config.functionsRegion);
          }
          
          // Initialiser Storage si besoin
          if (firebase.storage) {
            storage = firebase.storage();
          }
          
          // Si les émulateurs doivent être utilisés, configurer les connexions aux émulateurs
          if (useEmulators && config.useEmulators) {
            setupEmulators(config);
          }
          
          firebaseInitialized = true;
          
          logInfo('Firebase initialisé avec succès' + (useEmulators ? ' (mode émulateur)' : ''));
          
          // Déclencher l'événement d'initialisation
          document.dispatchEvent(new Event('firebase-ready'));
          
          resolve();
        } catch (error) {
          logError('Erreur lors de l\'initialisation de Firebase', error);
          reject(error);
        }
      })
      .withFailureHandler(function(error) {
        const errorMsg = 'Erreur lors de la récupération de la configuration Firebase';
        logError(errorMsg, error);
        reject(new Error(errorMsg));
      })
      .getFirebaseConfig(useEmulators); // Passer le paramètre pour inclure la config des émulateurs si nécessaire
  });
  
  return initializationPromise;
}

/**
 * Vérifie si Firebase est initialisé, sinon l'initialise
 * @return {Promise} Promesse résolue quand Firebase est prêt
 */
async function ensureFirebaseInitialized() {
  if (!firebaseInitialized) {
    return initFirebase();
  }
  return Promise.resolve();
}

/**
 * Retourne l'instance Firestore
 * @return {Object} Instance Firestore
 */
function getFirestoreInstance() {
  if (!firestoreDB) {
    logError('Firestore n\'est pas initialisé. Appelez initFirebase() d\'abord.');
  }
  return firestoreDB;
}

/**
 * Retourne l'instance Auth
 * @return {Object} Instance Auth
 */
function getAuthInstance() {
  if (!auth) {
    logError('Firebase Auth n\'est pas initialisé. Appelez initFirebase() d\'abord.');
  }
  return auth;
}

/**
 * Retourne l'instance Functions
 * @return {Object} Instance Functions
 */
function getFunctionsInstance() {
  if (!functions) {
    logError('Firebase Functions n\'est pas initialisé. Appelez initFirebase() d\'abord.');
  }
  return functions;
}

/**
 * Retourne l'instance Storage
 * @return {Object} Instance Storage
 */
function getStorageInstance() {
  if (!storage) {
    logError('Firebase Storage n\'est pas initialisé. Appelez initFirebase() d\'abord.');
  }
  return storage;
}

/**
 * Récupère un document Firestore
 * @param {string} collection - Nom de la collection
 * @param {string} docId - ID du document
 * @return {Promise<Object>} Document avec son ID
 */
async function getDocument(collection, docId) {
  await ensureFirebaseInitialized();
  
  try {
    const doc = await firestoreDB.collection(collection).doc(docId).get();
    return doc.exists ? { id: doc.id, ...doc.data() } : null;
  } catch (error) {
    logError(`Erreur lors de la récupération du document ${docId} dans ${collection}`, error);
    throw error;
  }
}

/**
 * Ajoute un document à Firestore
 * @param {string} collection - Nom de la collection
 * @param {Object} data - Données du document
 * @return {Promise<string>} ID du document créé
 */
async function addDocument(collection, data) {
  await ensureFirebaseInitialized();
  
  try {
    // Ajouter les timestamps de création et mise à jour
    const enhancedData = {
      ...data,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    const docRef = await firestoreDB.collection(collection).add(enhancedData);
    logInfo(`Document ajouté à ${collection} avec ID: ${docRef.id}`);
    return docRef.id;
  } catch (error) {
    logError(`Erreur lors de l'ajout d'un document à ${collection}`, error);
    throw error;
  }
}

/**
 * Met à jour un document Firestore
 * @param {string} collection - Nom de la collection
 * @param {string} docId - ID du document
 * @param {Object} data - Données à mettre à jour
 * @return {Promise<boolean>} Succès de l'opération
 */
async function updateDocument(collection, docId, data) {
  await ensureFirebaseInitialized();
  
  try {
    // Ajouter le timestamp de mise à jour
    const enhancedData = {
      ...data,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    
    await firestoreDB.collection(collection).doc(docId).update(enhancedData);
    logInfo(`Document ${docId} dans ${collection} mis à jour`);
    return true;
  } catch (error) {
    logError(`Erreur lors de la mise à jour du document ${docId} dans ${collection}`, error);
    throw error;
  }
}

/**
 * Supprime un document Firestore
 * @param {string} collection - Nom de la collection
 * @param {string} docId - ID du document
 * @return {Promise<boolean>} Succès de l'opération
 */
async function deleteDocument(collection, docId) {
  await ensureFirebaseInitialized();
  
  try {
    await firestoreDB.collection(collection).doc(docId).delete();
    logInfo(`Document ${docId} dans ${collection} supprimé`);
    return true;
  } catch (error) {
    logError(`Erreur lors de la suppression du document ${docId} dans ${collection}`, error);
    throw error;
  }
}

/**
 * Exécute une requête Firestore
 * @param {string} collection - Nom de la collection
 * @param {Function} queryFn - Fonction qui construit la requête
 * @return {Promise<Array>} Tableau des documents
 */
async function queryDocuments(collection, queryFn) {
  await ensureFirebaseInitialized();
  
  try {
    let query = firestoreDB.collection(collection);
    
    // Appliquer la fonction de requête si fournie
    if (queryFn) {
      query = queryFn(query);
    }
    
    const snapshot = await query.get();
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
  } catch (error) {
    logError(`Erreur lors de la requête sur ${collection}`, error);
    throw error;
  }
}

/**
 * Écoute les modifications d'un document
 * @param {string} collection - Nom de la collection
 * @param {string} docId - ID du document
 * @param {Function} callback - Fonction appelée avec le document mis à jour
 * @return {Function} Fonction pour arrêter l'écoute
 */
function listenToDocument(collection, docId, callback) {
  if (!firestoreDB) {
    logError('Firestore n\'est pas initialisé. Appelez initFirebase() d\'abord.');
    return () => {}; // Unsubscribe no-op
  }
  
  return firestoreDB.collection(collection).doc(docId)
    .onSnapshot(
      (doc) => {
        if (doc.exists) {
          callback({ id: doc.id, ...doc.data() });
        } else {
          callback(null);
        }
      },
      (error) => {
        logError(`Erreur d'écoute sur le document ${docId} dans ${collection}`, error);
      }
    );
}

/**
 * Écoute les modifications d'une collection
 * @param {string} collection - Nom de la collection
 * @param {Function} queryFn - Fonction qui construit la requête (optionnel)
 * @param {Function} callback - Fonction appelée avec les documents mis à jour
 * @return {Function} Fonction pour arrêter l'écoute
 */
function listenToCollection(collection, queryFn, callback) {
  if (!firestoreDB) {
    logError('Firestore n\'est pas initialisé. Appelez initFirebase() d\'abord.');
    return () => {}; // Unsubscribe no-op
  }
  
  let query = firestoreDB.collection(collection);
  
  // Appliquer la fonction de requête si fournie
  if (typeof queryFn === 'function') {
    query = queryFn(query);
  } else if (typeof queryFn === 'object' && typeof callback === 'undefined') {
    // Si queryFn est un objet et callback est non défini, alors queryFn est en fait le callback
    callback = queryFn;
  }
  
  return query.onSnapshot(
    (snapshot) => {
      const docs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(docs);
    },
    (error) => {
      logError(`Erreur d'écoute sur la collection ${collection}`, error);
    }
  );
}

/**
 * Exécute une transaction Firestore
 * @param {Function} updateFn - Fonction qui effectue la transaction
 * @return {Promise<any>} Résultat de la transaction
 */
async function runTransaction(updateFn) {
  await ensureFirebaseInitialized();
  
  try {
    return await firestoreDB.runTransaction(updateFn);
  } catch (error) {
    logError('Erreur lors de l\'exécution de la transaction Firestore', error);
    throw error;
  }
}

/**
 * Exécute un lot d'opérations Firestore
 * @param {Function} batchFn - Fonction qui reçoit l'objet batch et le remplit d'opérations
 * @return {Promise<void>} Promesse résolue quand le batch est terminé
 */
async function runBatch(batchFn) {
  await ensureFirebaseInitialized();
  
  try {
    const batch = firestoreDB.batch();
    batchFn(batch);
    await batch.commit();
    logInfo('Batch Firestore exécuté avec succès');
  } catch (error) {
    logError('Erreur lors de l\'exécution du batch Firestore', error);
    throw error;
  }
}

/**
 * Appelle une Cloud Function Firebase
 * @param {string} name - Nom de la fonction
 * @param {Object} data - Données à envoyer
 * @return {Promise<any>} Résultat de la fonction
 */
async function callFunction(name, data = {}) {
  await ensureFirebaseInitialized();
  
  try {
    const functionRef = functions.httpsCallable(name);
    const result = await functionRef(data);
    return result.data;
  } catch (error) {
    logError(`Erreur lors de l'appel à la fonction ${name}`, error);
    throw error;
  }
}
