/**
 * firebase/firestoreUtils.js
 * Firestore helpers for writing and reading the shared global logs/ collection.
 * Any authenticated user can read all logs; writes tag the submitter's uid + name.
 */
import { db } from './config'
import {
  collection,
  doc,
  setDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore'

const LOGS_COLLECTION = 'logs'

/**
 * Save a query log to the global Firestore logs/ collection.
 * @param {string} queryId - Matches the orchestrator task_id
 * @param {object} logData - Routing result fields
 * @param {object} user    - Firebase currentUser (for uid + displayName)
 */
export async function saveQueryLog(queryId, logData, user) {
  try {
    const docRef = doc(db, LOGS_COLLECTION, queryId)
    await setDoc(docRef, {
      queryId,
      prompt:            logData.prompt || '',
      category:          logData.category || 'unknown',
      tierUsed:          logData.tierUsed || 'unknown',
      modelUsed:         logData.modelUsed || null,
      latencyMs:         logData.latencyMs || 0,
      totalTokens:       logData.totalTokens || 0,
      answer:            logData.answer || '',
      confidence:        logData.confidence ?? null,
      escalationReason:  logData.escalationReason || null,
      submittedBy:       user?.uid || 'anonymous',
      submittedByName:   user?.displayName || 'Unknown',
      submittedByPhoto:  user?.photoURL || null,
      timestamp:         serverTimestamp(),
    })
  } catch (err) {
    console.error('[Firestore] Failed to save query log:', err.message)
  }
}

/**
 * Subscribe to the global logs/ collection in real-time.
 * Returns an unsubscribe function. Calls onUpdate(logs[]) on every change.
 * @param {function} onUpdate - Callback with array of log objects
 * @param {number} limitCount - Max number of logs to fetch (default 50)
 */
export function subscribeToLogs(onUpdate, limitCount = 50) {
  const q = query(
    collection(db, LOGS_COLLECTION),
    orderBy('timestamp', 'desc'),
    limit(limitCount)
  )

  return onSnapshot(q, (snapshot) => {
    const logs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))
    onUpdate(logs)
  }, (err) => {
    console.error('[Firestore] Log subscription error:', err.message)
  })
}
