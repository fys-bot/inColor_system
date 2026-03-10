import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';

const firebaseConfig = {
  apiKey: 'AIzaSyCvm1gjloqi78Xe-KKWI0qhaRplSKF2x2M',
  authDomain: 'incolor-cff73.firebaseapp.com',
  databaseURL: 'https://incolor-cff73.firebaseio.com',
  projectId: 'incolor-cff73',
  storageBucket: 'incolor-cff73.appspot.com',
  messagingSenderId: '1055509676043',
  appId: '1:1055509676043:web:83b5c1cbd516dc65',
};

const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);
const db = getDatabase(app);

const PREFIX = 'https://firebasestorage.googleapis.com/v0/b/incolor-cff73.appspot.com/o/';
const SUFFIX = '?alt=media';
const SEPARATOR = '%2F';
const ASSET = 'resources%2Flarge';

const TYPE_BOOK = 'book';
const TYPE_UGC = 'ugc';
const TYPE_AI = 'ai';

function isInternalAI(type, patternName) {
  if (type === TYPE_AI) {
    const s = patternName.split('-')[0];
    return s.length === 8 && /^\d+$/.test(s);
  }
  return false;
}

function aiImageThumbUri(id) {
  return PREFIX + ['imagen-thumb', id + '.webp'].join(SEPARATOR) + SUFFIX;
}

function thumbUri(type, patternName) {
  type = isInternalAI(type, patternName) ? 'book' : type;
  switch (type) {
    case TYPE_BOOK:
      return PREFIX + [ASSET, 'thumb', patternName + '.webp'].join(SEPARATOR) + SUFFIX;
    case TYPE_UGC:
      return PREFIX + ['posts', 'thumb', patternName + '.webp'].join(SEPARATOR) + SUFFIX;
    case TYPE_AI:
      return aiImageThumbUri(patternName.replace('ai-', ''));
    default:
      return PREFIX + [ASSET, 'thumb', patternName + '.webp'].join(SEPARATOR) + SUFFIX;
  }
}

export { app, firestore, db, PREFIX, SUFFIX, SEPARATOR, thumbUri };
