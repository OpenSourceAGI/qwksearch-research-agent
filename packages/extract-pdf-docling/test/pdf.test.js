// client-example.js
// Example client code to test the API

async function testConvertImage() {
    const response = await fetch('http://localhost:3000/api/v1/convert', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            imageUrl: 'https://huggingface.co/ibm-granite/granite-docling-258M/resolve/main/assets/new_arxiv.png',
            prompt: 'Convert this page to docling.',
            maxTokens: 4096,
            streaming: false,
        }),
    });

    const result = await response.json();
    console.log('Conversion result:', result);
}

async function testConvertBase64() {
    // First, load an image and convert to base64 (example)
    const imageResponse = await fetch('https://huggingface.co/ibm-granite/granite-docling-258M/resolve/main/assets/new_arxiv.png');
    const blob = await imageResponse.blob();
    const buffer = await blob.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(buffer)));

    const response = await fetch('http://localhost:3000/api/v1/convert-base64', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            imageBase64: base64,
            mimeType: 'image/png',
            prompt: 'Convert this page to docling.',
            maxTokens: 4096,
        }),
    });

    const result = await response.json();
    console.log('Base64 conversion result:', result);
}

async function testStreamingConversion() {
    const response = await fetch('http://localhost:3000/api/v1/convert-stream', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            imageUrl: 'https://huggingface.co/ibm-granite/granite-docling-258M/resolve/main/assets/new_arxiv.png',
            prompt: 'Convert this page to docling.',
            maxTokens: 4096,
        }),
    });

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
            if (line.startsWith('data: ')) {
                const data = JSON.parse(line.slice(6));
                if (data.text) {
                    process.stdout.write(data.text);
                }
                if (data.done && data.fullText) {
                    console.log('\n\nFull text:', data.fullText);
                }
            }
        }
    }
}

// Run tests
async function runTests() {
    try {
        console.log('Testing image URL conversion...');
        await testConvertImage();

        // console.log('\nTesting base64 conversion...');
        // await testConvertBase64();

        // console.log('\nTesting streaming conversion...');
        // await testStreamingConversion();
    } catch (error) {
        console.error('Test error:', error);
    }
}

// Uncomment to run tests
runTests();