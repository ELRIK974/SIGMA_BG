/**
 * Données du tableau de bord pour SIGMA
 * 
 * Ce fichier contient:
 * - Récupération des données pour les tableaux du dashboard
 * - Logique spécifique au dashboard
 */

// Récupération des alertes de stock
function getStockAlerts(callback) {
  const db = getFirestoreInstance();
  
  // Écouter les alertes stock en temps réel (stocks sous le seuil d'alerte)
  return db.collection('stocks')
    .where('quantite', '<=', db.FieldPath.documentId('seuilAlerte'))
    .onSnapshot(snapshot => {
      const alerts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      callback(alerts);
    });
}

// Récupération du matériel spécifique manquant
function getMaterielManquant(callback) {
  const db = getFirestoreInstance();
  
  // Écouter le matériel marqué comme "à commander"
  return db.collection('stocks')
    .where('aCommander', '==', true)
    .onSnapshot(snapshot => {
      const materiel = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      callback(materiel);
    });
}

// Récupération des emprunts non revenus
function getEmpruntsNonRevenus(callback) {
  const db = getFirestoreInstance();
  const now = new Date();
  
  // Écouter les emprunts avec statut "Parti" et date de retour dépassée
  return db.collection('emprunts')
    .where('statut', '==', 'Parti')
    .where('dateRetourPrevue', '<=', now)
    .onSnapshot(snapshot => {
      const emprunts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      callback(emprunts);
    });
}

// Récupération des prochains emprunts
function getProchainsEmprunts(callback) {
  const db = getFirestoreInstance();
  const now = new Date();
  const inOneMonth = new Date();
  inOneMonth.setDate(inOneMonth.getDate() + 30);
  
  // Écouter les emprunts à venir dans les 30 prochains jours
  return db.collection('emprunts')
    .where('dateDepart', '>=', now)
    .where('dateDepart', '<=', inOneMonth)
    .onSnapshot(snapshot => {
      const emprunts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      callback(emprunts);
    });
}

// Récupération des modules non opérationnels
function getModulesNonOperationnels(callback) {
  const db = getFirestoreInstance();
  
  // Écouter les modules avec statut "Non opérationnel"
  return db.collection('modules')
    .where('estPret', '==', false)
    .onSnapshot(snapshot => {
      const modules = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      callback(modules);
    });
}

// Récupération du matériel non opérationnel
function getMaterielNonOperationnel(callback) {
  const db = getFirestoreInstance();
  
  // Écouter le matériel avec statut "Non opérationnel"
  return db.collection('stocks')
    .where('estOperationnel', '==', false)
    .onSnapshot(snapshot => {
      const materiel = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      callback(materiel);
    });
}

// Récupération des emprunts en attente d'inventaire/facturation
function getEmpruntsEnAttente(callback) {
  const db = getFirestoreInstance();
  
  // Écouter les emprunts revenus mais non inventoriés ou non facturés
  return db.collection('emprunts')
    .where('statut', '==', 'Revenu')
    .where('estInventorie', '==', false)
    .onSnapshot(snapshot => {
      const emprunts = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      callback(emprunts);
    });
}
