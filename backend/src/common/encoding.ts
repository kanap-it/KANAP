export function decodeCsvBufferUtf8OrThrow(buf: Buffer): string {
  // Enforce UTF-8 to avoid mojibake; provide clear error otherwise
  try {
    // Use TextDecoder with fatal=true to reject invalid sequences
    const dec = new (global as any).TextDecoder('utf-8', { fatal: true });
    let s = dec.decode(buf);
    if (s.length > 0 && s.charCodeAt(0) === 0xFEFF) s = s.slice(1); // strip BOM
    return s;
  } catch {
    // Re-throw; caller should respond with a helpful error
    throw new Error('INVALID_UTF8');
  }
}
