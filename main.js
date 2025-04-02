/**
 * Script principal de SIGMA
 * 
 * Ce fichier contient la logique d'initialisation et les fonctions
 * globales utilisées dans toute l'application
 */

// Vérifier que nous sommes bien dans l'environnement navigateur
// pour éviter les erreurs d'exécution côté serveur
if (typeof document !== 'undefined') {
  // Variables globales pour l'état de l'application
  let appInitialized = false;

  // Exécuter une fois que la page est chargée
  document.addEventListener('DOMContentLoaded', function() {
    // Logger le démarrage de l'application
    logInfo('Application SIGMA en cours de démarrage', {
      url: window.location.href,
      timestamp: new Date().toISOString()
    });
    
    // Gérer les erreurs non capturées pour les logger
    window.addEventListener('error', function(event) {
      logError('Erreur non capturée', {
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        error: event.error ? event.error.stack : null
      });
      
      // Ne pas empêcher le comportement par défaut
      return false;
    });
    
    // Gérer les rejets de promesses non capturés
    window.addEventListener('unhandledrejection', function(event) {
      logError('Promesse rejetée non capturée', {
        reason: event.reason ? event.reason.toString() : 'Raison inconnue',
        stack: event.reason && event.reason.stack ? event.reason.stack : null
      });
    });
    
    // Initialiser Firebase
    initFirebase()
      .then(() => {
        // Vérifier l'authentification
        return checkAuth();
      })
      .then(() => {
        // Initialiser l'interface utilisateur
        return initUI();
      })
      .then(() => {
        appInitialized = true;
        logInfo('Application SIGMA initialisée avec succès');
        
        // Déclencher un événement pour signaler que l'application est prête
        document.dispatchEvent(new Event('sigma-ready'));
      })
      .catch(error => {
        logError('Erreur lors de l\'initialisation de l\'application', error);
        showErrorMessage('Une erreur est survenue lors du chargement de l\'application. Veuillez réessayer ou contacter l\'administrateur.');
      });
  });
}

/**
 * Vérifie si l'utilisateur est connecté
 * @return {Promise} - Promesse résolue quand la vérification est terminée
 */
function checkAuth() {
  // Vérifier que nous sommes dans l'environnement navigateur
  if (typeof document === 'undefined') {
    return Promise.resolve(); // Résoudre immédiatement dans l'environnement serveur
  }
  
  return new Promise((resolve, reject) => {
    try {
      const auth = getAuthInstance();
      
      if (!auth) {
        // Firebase pas encore prêt, résoudre quand même pour ne pas bloquer l'UI
        logWarning('Auth non initialisée lors de checkAuth');
        resolve();
        return;
      }
      
      // Vérifier l'état de l'authentification
      auth.onAuthStateChanged(user => {
        if (user) {
          // Utilisateur connecté
          logInfo('Utilisateur connecté', {
            uid: user.uid,
            email: user.email,
            displayName: user.displayName
          });
          
          updateState({ 
            user: {
              uid: user.uid,
              email: user.email,
              displayName: user.displayName,
              photoURL: user.photoURL
            }
          });
          
          // Vérifier les rôles de l'utilisateur (si la fonction existe)
          if (typeof getUserRole === 'function') {
            getUserRole(user).catch(error => {
              logError('Erreur lors de la récupération du rôle', error);
            });
          }
        } else {
          // Utilisateur non connecté
          logInfo('Aucun utilisateur connecté');
          updateState({ user: null, userRole: null });
          
          // TODO: À décommenter plus tard quand on implémentera l'authentification complète
          // Si l'authentification est requise, rediriger vers la page de connexion
          // window.location.href = '?page=login';
        }
        
        resolve();
      }, error => {
        logError('Erreur d\'authentification', error);
        reject(error);
      });
    } catch (error) {
      logError('Erreur lors de la vérification de l\'authentification', error);
      reject(error);
    }
  });
}

/**
 * Initialise l'interface utilisateur
 * @return {Promise} - Promesse résolue quand l'UI est initialisée
 */
function initUI() {
  // Vérifier que nous sommes dans l'environnement navigateur
  if (typeof document === 'undefined') {
    return Promise.resolve(); // Résoudre immédiatement dans l'environnement serveur
  }
  
  return new Promise((resolve, reject) => {
    try {
      logInfo('Initialisation de l\'interface utilisateur');
      
      // Initialiser les composants de l'interface
      const components = [
        'alertesStock',
        // Ajouter d'autres composants ici
      ];
      
      // Initialiser chaque composant
      Promise.all(components.map(initComponent))
        .then(() => {
          logInfo('Tous les composants UI ont été initialisés');
          resolve();
        })
        .catch(error => {
          logError('Erreur lors de l\'initialisation des composants UI', error);
          reject(error);
        });
    } catch (error) {
      logError('Erreur lors de l\'initialisation de l\'UI', error);
      reject(error);
    }
  });
}

/**
 * Initialise un composant UI spécifique
 * @param {string} componentId - ID du composant à initialiser
 * @return {Promise} - Promesse résolue quand le composant est initialisé
 */
function initComponent(componentId) {
  // Vérifier que nous sommes dans l'environnement navigateur
  if (typeof document === 'undefined') {
    return Promise.resolve(); // Résoudre immédiatement dans l'environnement serveur
  }
  
  return new Promise((resolve) => {
    // Placeholder pour l'initialisation d'un composant spécifique
    // À implémenter selon les besoins de chaque composant
    logInfo(`Initialisation du composant: ${componentId}`);
    
    // Pour l'instant, simplement résoudre la promesse
    // Plus tard, on ajoutera la logique spécifique à chaque composant
    setTimeout(resolve, 100); // Simule une initialisation asynchrone
  });
}

/**
 * Affiche un message d'erreur dans l'interface
 * @param {string} message - Message d'erreur à afficher
 */
function showErrorMessage(message) {
  // Vérifier que nous sommes dans l'environnement navigateur
  if (typeof document === 'undefined') return;
  
  // Vérifier si un conteneur de notification existe déjà
  let notificationContainer = document.getElementById('notifications');
  
  // Si non, en créer un
  if (!notificationContainer) {
    notificationContainer = document.createElement('div');
    notificationContainer.id = 'notifications';
    notificationContainer.style.position = 'fixed';
    notificationContainer.style.top = '20px';
    notificationContainer.style.right = '20px';
    notificationContainer.style.zIndex = '1000';
    document.body.appendChild(notificationContainer);
  }
  
  // Créer la notification
  const notification = document.createElement('div');
  notification.className = 'notification notification-error';
  notification.textContent = message;
  
  // Ajouter un bouton de fermeture
  const closeButton = document.createElement('button');
  closeButton.className = 'notification-close';
  closeButton.innerHTML = '&times;';
  closeButton.onclick = function() {
    notification.remove();
  };
  notification.appendChild(closeButton);
  
  // Ajouter la notification au conteneur
  notificationContainer.appendChild(notification);
  
  // Supprimer après un délai
  setTimeout(() => {
    notification.classList.add('fade-out');
    setTimeout(() => notification.remove(), 500);
  }, 5000);
}
