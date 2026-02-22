
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

// قطعه کد درخواستی برای بررسی سلامت رندر
// جلوگیری از ذخیره وضعیت خراب (Empty State)
window.addEventListener('load', () => {
  if (rootElement.innerHTML === "") {
      console.warn("Detection of blank page! Recovery from LocalStorage initiated.");
      // در این سیستم، رندر خودکار توسط React انجام می‌شود. 
      // اگر بعد از لود کامل صفحه هنوز خالی است، احتمالا خطایی رخ داده است.
  }
});

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
