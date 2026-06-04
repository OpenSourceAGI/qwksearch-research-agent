import {test, expect} from 'vitest';
import {importTopDomains} from '../src/download-1m'

test('import top domains', async () => {

    var result = await importTopDomains();

    await new Promise(resolve => setTimeout(resolve, 40000));

    console.log(result);
    expect(result).toBeDefined();

}, 40000)
