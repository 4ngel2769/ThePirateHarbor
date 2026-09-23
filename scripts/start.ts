process.env.BODY_SIZE_LIMIT ??= '12M';
process.env.TPH_HTTPS ??= process.env.ORIGIN?.startsWith('https://') ? '1' : '0';
process.env.NODE_ENV ??= 'production';
await import('../build/index.js');
