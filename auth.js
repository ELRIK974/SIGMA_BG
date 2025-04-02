/**
 * Fonctions d'authentification pour SIGMA
 * 
 * Ce fichier gère:
 * - La connexion et déconnexion
 * - La gestion des utilisateurs
 * - La vérification des rôles
 */

// Observer l'état d'authentification
function initAuth() {
  const auth = getAuthInstance();
  
  auth.onAuthStateChanged(user => {
    if (user) {
      // Utilisateur connecté
      console.log('Utilisateur connecté:', user.email);
      
      // Mettre à jour l'état de l'application
      updateState({ user: { 
        uid: user.uid, 
        email: user.email, 
        displayName: user.displayName,
        photoURL: user.photoURL
      }});
      
      // Vérifier les rôles de l'utilisateur
      getUserRole(user);
    } else {
      // Utilisateur déconnecté
      console.log('Utilisateur déconnecté');
      updateState({ user: null, userRole: null });
      
      // Rediriger vers la page de connexion si nécessaire
      // window.location.href = 'login.html';
    }
  });
}

// Connecter un utilisateur avec Google
function signInWithGoogle() {
  const auth = getAuthInstance();
  const provider = new firebase.auth.GoogleAuthProvider();
  
  auth.signInWithPopup(provider)
    .then(result => {
      console.log('Connexion réussie:', result.user.email);
    })
    .catch(error => {
      console.error('Erreur de connexion:', error);
      showNotification('Erreur lors de la connexion: ' + error.message, 'error');
    });
}

// Déconnecter l'utilisateur
function signOut() {
  const auth = getAuthInstance();
  
  auth.signOut()
    .then(() => {
      console.log('Déconnexion réussie');
      showNotification('Vous avez été déconnecté', 'info');
    })
    .catch(error => {
      console.error('Erreur de déconnexion:', error);
    });
}

// Obtenir le rôle de l'utilisateur
async function getUserRole(user) {
  try {
    const db = getFirestoreInstance();
    const userDoc = await db.collection('users').doc(user.uid).get();
    
    if (userDoc.exists) {
      const userData = userDoc.data();
      updateState({ userRole: userData.role });
      console.log('Rôle utilisateur:', userData.role);
    } else {
      // Créer l'utilisateur s'il n'existe pas
      await db.collection('users').doc(user.uid).set({
        email: user.email,
        displayName: user.displayName || '',
        role: 'utilisateur', // Rôle par défaut
        createdAt: firebase.firestore.FieldValue.serverTimestamp()
      });
      
      updateState({ userRole: 'utilisateur' });
      console.log('Nouvel utilisateur créé avec le rôle: utilisateur');
    }
  } catch (error) {
    console.error('Erreur lors de la récupération du rôle:', error);
  }
}

// Vérifier si l'utilisateur a un rôle spécifique
function hasRole(requiredRole) {
  const { userRole } = appState;
  
  // Si l'utilisateur est admin, il a accès à tout
  if (userRole === 'admin') return true;
  
  // Sinon, vérifier le rôle spécifique
  if (requiredRole === 'regisseur') {
    return userRole === 'regisseur' || userRole === 'admin';
  }
  
  // Pour le rôle 'utilisateur', tous les utilisateurs connectés y ont accès
  if (requiredRole === 'utilisateur') {
    return !!userRole;
  }
  
  return false;
}
