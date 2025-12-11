import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux'; 
import { store } from './redux/store.js'; 

import App from './App.jsx';
import './index.css';


ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <Provider store={store}> {/* <--- Bọc App bằng Provider */}
            <App />
        </Provider>
    </React.StrictMode>
);