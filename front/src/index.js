// Import the OpenTelemetry integration
import './htmx-opentelemetry.js';

// Add any additional application code here
console.log('Application initialized');

// // For demo purposes, add a non-HTMX XHR request button event listener
// document.addEventListener('DOMContentLoaded', () => {
//   // This demonstrates a regular XHR request (not through HTMX)
//   // It will still be traced by OpenTelemetry's XMLHttpRequest instrumentation
//   const regularXhrButton = document.createElement('button');
//   regularXhrButton.textContent = 'Regular XHR Request';
//   regularXhrButton.addEventListener('click', () => {
//     const xhr = new XMLHttpRequest();
//     xhr.open('GET', '/api/data');
//     xhr.onload = () => {
//       console.log('Regular XHR request completed');
//     };
//     xhr.onerror = () => {
//       console.error('Regular XHR request failed');
//     };
//     xhr.send();
//   });
  
//   // Add the button to the page
//   const container = document.querySelector('.container');
//   container.insertBefore(regularXhrButton, document.getElementById('content-area'));
// });