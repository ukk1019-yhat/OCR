const fetch = require('node-fetch');

async function testUpload() {
  const payload = {
    documents: [{
      filename: 'test.jpg',
      url: 'https://www.google.com/images/branding/googlelogo/1x/googlelogo_color_272x92dp.png', // valid public url to test download
      path: 'documents/123_test.jpg'
    }]
  };

  try {
    const res = await fetch('http://localhost:8000/api/v1/documents/upload', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-client-id': 'test-client'
      },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    console.log('Upload response:', data);
  } catch(e) {
    console.error('Fetch failed', e);
  }
}

testUpload();
