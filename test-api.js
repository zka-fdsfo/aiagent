const aiController = require('./controllers/aiController');
console.log('=================================');
console.log('Testing aiController export:');
console.log('=================================');
console.log('Controller:', aiController);
console.log('getAIResponse type:', typeof aiController.getAIResponse);
console.log('getAIResponse function:', aiController.getAIResponse);
console.log('=================================');

if (typeof aiController.getAIResponse === 'function') {
  console.log('✅ SUCCESS: Export is working correctly!');
} else {
  console.log('❌ FAILED: Export is NOT working');
  console.log('Expected: function, Got:', typeof aiController.getAIResponse);
}