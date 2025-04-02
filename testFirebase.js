/**
 * Utilitaires de test pour les fonctionnalités Firebase dans SIGMA
 * 
 * Ce fichier contient des fonctions pour tester la connexion Firebase
 * et les opérations CRUD de base sur Firestore.
 * 
 * À utiliser uniquement en développement et test, ne pas inclure en production.
 */

/**
 * Active ou désactive le mode émulateur Firebase
 * @param {boolean} enable - True pour activer les émulateurs, false pour désactiver
 */
function toggleEmulatorMode(enable) {
  try {
    localStorage.setItem('SIGMA_USE_EMULATORS', enable ? 'true' : 'false');
    logInfo(`Mode émulateur ${enable ? 'activé' : 'désactivé'}, rafraîchissez la page pour appliquer les changements`);
    return true;
  } catch (error) {
    logError('Erreur lors de la configuration du mode émulateur', error);
    return false;
  }
}

/**
 * Exécute un test complet de la connexion Firebase et des opérations CRUD
 * @return {Promise<Object>} Résultat des tests
 */
async function testFirebaseConnection() {
  const results = {
    initialization: false,
    document: {
      creation: false,
      reading: false,
      update: false,
      deletion: false
    },
    query: false,
    transaction: false,
    errors: []
  };
  
  try {
    // 1. Tester l'initialisation Firebase
    try {
      await ensureFirebaseInitialized();
      results.initialization = true;
      logInfo('Test d\'initialisation Firebase réussi');
    } catch (error) {
      results.errors.push({ stage: 'initialization', error: error.toString() });
      logError('Échec du test d\'initialisation Firebase', error);
      // On arrête les tests si l'initialisation échoue
      return results;
    }
    
    // 2. Tester les opérations CRUD sur un document
    // Créer un objet test avec un horodatage unique pour éviter les conflits
    const testDocData = {
      name: 'Document Test',
      value: Math.floor(Math.random() * 1000),
      timestamp: new Date().toISOString()
    };
    
    let testDocId;
    
    // 2.1 Création
    try {
      testDocId = await addDocument('tests', testDocData);
      results.document.creation = true;
      logInfo(`Test de création de document réussi, ID: ${testDocId}`);
    } catch (error) {
      results.errors.push({ stage: 'document.creation', error: error.toString() });
      logError('Échec du test de création de document', error);
      return results;
    }
    
    // 2.2 Lecture
    try {
      const doc = await getDocument('tests', testDocId);
      results.document.reading = doc && doc.name === testDocData.name;
      if (results.document.reading) {
        logInfo('Test de lecture de document réussi');
      } else {
        throw new Error('Document lu incorrect');
      }
    } catch (error) {
      results.errors.push({ stage: 'document.reading', error: error.toString() });
      logError('Échec du test de lecture de document', error);
    }
    
    // 2.3 Mise à jour
    try {
      const updateData = { value: 999, updated: true };
      await updateDocument('tests', testDocId, updateData);
      
      // Vérifier la mise à jour
      const updatedDoc = await getDocument('tests', testDocId);
      results.document.update = updatedDoc && updatedDoc.value === 999 && updatedDoc.updated === true;
      
      if (results.document.update) {
        logInfo('Test de mise à jour de document réussi');
      } else {
        throw new Error('Mise à jour incorrecte');
      }
    } catch (error) {
      results.errors.push({ stage: 'document.update', error: error.toString() });
      logError('Échec du test de mise à jour de document', error);
    }
    
    // 3. Tester une requête
    try {
      const queryResult = await queryDocuments('tests', (ref) => 
        ref.where('updated', '==', true).limit(10)
      );
      
      results.query = Array.isArray(queryResult) && queryResult.length > 0;
      logInfo(`Test de requête réussi, ${queryResult.length} documents trouvés`);
    } catch (error) {
      results.errors.push({ stage: 'query', error: error.toString() });
      logError('Échec du test de requête', error);
    }
    
    // 4. Tester une transaction
    try {
      const transactionResult = await runTransaction(async (transaction) => {
        // Lire le document dans la transaction
        const docRef = firestoreDB.collection('tests').doc(testDocId);
        const docSnapshot = await transaction.get(docRef);
        
        if (!docSnapshot.exists) {
          throw new Error('Document non trouvé pour la transaction');
        }
        
        // Modifier et écrire dans la transaction
        const newData = docSnapshot.data();
        newData.transactionTest = true;
        newData.transactionValue = 42;
        
        transaction.update(docRef, newData);
        return 'Transaction réussie';
      });
      
      // Vérifier que la transaction a bien été appliquée
      const transactionDoc = await getDocument('tests', testDocId);
      results.transaction = transactionDoc && 
                           transactionDoc.transactionTest === true && 
                           transactionDoc.transactionValue === 42;
      
      if (results.transaction) {
        logInfo('Test de transaction réussi');
      } else {
        throw new Error('Transaction incorrecte');
      }
    } catch (error) {
      results.errors.push({ stage: 'transaction', error: error.toString() });
      logError('Échec du test de transaction', error);
    }
    
    // 2.4 Suppression (effectuée en dernier pour le nettoyage)
    try {
      await deleteDocument('tests', testDocId);
      
      // Vérifier la suppression
      const deletedDoc = await getDocument('tests', testDocId);
      results.document.deletion = deletedDoc === null;
      
      if (results.document.deletion) {
        logInfo('Test de suppression de document réussi');
      } else {
        throw new Error('Suppression incorrecte');
      }
    } catch (error) {
      results.errors.push({ stage: 'document.deletion', error: error.toString() });
      logError('Échec du test de suppression de document', error);
    }
    
  } catch (error) {
    results.errors.push({ stage: 'global', error: error.toString() });
    logError('Erreur générale lors des tests Firebase', error);
  }
  
  // Résumé des tests
  const allTests = [
    results.initialization,
    results.document.creation,
    results.document.reading,
    results.document.update,
    results.document.deletion,
    results.query,
    results.transaction
  ];
  
  const totalTests = allTests.length;
  const passedTests = allTests.filter(result => result === true).length;
  
  logInfo(`Tests Firebase complétés: ${passedTests}/${totalTests} tests réussis`);
  
  return results;
}

/**
 * Affiche un rapport détaillé des résultats des tests Firebase
 * @param {Object} results - Résultats des tests retournés par testFirebaseConnection
 */
function displayTestResults(results) {
  console.group('Résultats des tests Firebase');
  
  console.log(`Initialisation: ${results.initialization ? '✅' : '❌'}`);
  
  console.group('Opérations sur documents');
  console.log(`Création: ${results.document.creation ? '✅' : '❌'}`);
  console.log(`Lecture: ${results.document.reading ? '✅' : '❌'}`);
  console.log(`Mise à jour: ${results.document.update ? '✅' : '❌'}`);
  console.log(`Suppression: ${results.document.deletion ? '✅' : '❌'}`);
  console.groupEnd();
  
  console.log(`Requête: ${results.query ? '✅' : '❌'}`);
  console.log(`Transaction: ${results.transaction ? '✅' : '❌'}`);
  
  if (results.errors.length > 0) {
    console.group('Erreurs');
    results.errors.forEach((error, index) => {
      console.log(`${index + 1}. Étape: ${error.stage}, Erreur: ${error.error}`);
    });
    console.groupEnd();
  }
  
  console.groupEnd();
}

/**
 * Exécute et affiche les résultats des tests Firebase
 * Combine testFirebaseConnection et displayTestResults pour plus de commodité
 * @return {Promise<Object>} Résultat des tests
 */
async function runFirebaseTests() {
  const results = await testFirebaseConnection();
  displayTestResults(results);
  return results;
}
