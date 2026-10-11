import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import { persistor, store } from './redux/store.js';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import { I18nProvider } from './i18n/I18nContext.jsx';

ReactDOM.createRoot(document.getElementById('root')).render(
  <Provider store={store}>
    <PersistGate loading={null} persistor={persistor}>
      <I18nProvider>
        <App />
      </I18nProvider>
    </PersistGate>
  </Provider>
);
