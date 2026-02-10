import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { saveLanguagePreference, loadLanguagePreference } from './firebase/authService';

// Importar archivos de traducción
import es from './locales/es.json';
import en from './locales/en.json';
import fr from './locales/fr.json';
import de from './locales/de.json';
import pt from './locales/pt.json';
import it from './locales/it.json';

const resources = {
  es: { translation: es },
  en: { translation: en },
  fr: { translation: fr },
  de: { translation: de },
  pt: { translation: pt },
  it: { translation: it }
};

// Idiomas soportados
const supportedLngs = ['es', 'en', 'fr', 'de', 'pt', 'it'];

// Detectar idioma del dispositivo/navegador
function detectDeviceLanguage() {
  const nav = navigator.language || navigator.userLanguage || 'es';
  const code = nav.split('-')[0].toLowerCase(); // "es-ES" → "es"
  return supportedLngs.includes(code) ? code : 'es';
}

// Obtener idioma guardado del localStorage o usar el del dispositivo
const savedLanguage = localStorage.getItem('language') || detectDeviceLanguage();

i18n
  .use(initReactI18next) // pasa i18n hacia react-i18next
  .init({
    resources,
    lng: savedLanguage,
    fallbackLng: 'es', // idioma por defecto
    
    interpolation: {
      escapeValue: false, // React ya escapa por defecto
    },
    
    // Opciones adicionales
    debug: false, // establecer a true para debug en desarrollo
    returnNull: false, // devolver clave si no se encuentra traducción
    returnEmptyString: false,
    
    // Guardar idioma en localStorage cuando cambie
    updateMissing: false,
  });

// Escuchar cambios de idioma para guardar en localStorage + Firebase
i18n.on('languageChanged', (lng) => {
  localStorage.setItem('language', lng);
  saveLanguagePreference(lng); // guarda en Firebase si hay usuario logueado
});

// Cargar idioma de Firebase cuando el usuario hace login
export async function syncLanguageFromFirebase() {
  const lang = await loadLanguagePreference();
  if (lang && supportedLngs.includes(lang)) {
    i18n.changeLanguage(lang);
  }
}

export default i18n;