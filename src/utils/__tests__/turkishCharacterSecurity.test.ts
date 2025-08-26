/**
 * Test for Turkish character handling in security validation
 */

import { validateFileUploadSecurity } from '../fileSecurityValidation';

// Mock console.log to avoid noise in tests
const originalLog = console.log;
beforeAll(() => {
  console.log = jest.fn();
});

afterAll(() => {
  console.log = originalLog;
});

describe('Turkish Character Security Validation', () => {
  test('should handle Turkish characters in filename without security issues', async () => {
    // Create a simple PDF-like file with Turkish characters in name
    const pdfContent = '%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n>>\nendobj\nxref\n0 1\n0000000000 65535 f \ntrailer\n<<\n/Size 1\n/Root 1 0 R\n>>\nstartxref\n45\n%%EOF';
    const blob = new Blob([pdfContent], { type: 'application/pdf' });
    const file = new File([blob], 'Hasan Özdişçi CV.pdf', { type: 'application/pdf' });

    const result = await validateFileUploadSecurity(file, {
      enableVirusScanning: true,
      enableMalwareDetection: true,
      enableContentValidation: false, // Skip content validation for this test
      maxScanTime: 1000,
    });

    // Should not have threats related to Turkish characters
    expect(result.threats).not.toContain(expect.stringContaining('Suspicious pattern detected: \\x4d\\x5a'));
    expect(result.sanitizedFilename).toBe('hasan_ozdisci_cv.pdf');
    
    console.log('Test result:', result);
  });

  test('should still detect actual MZ header at file start', async () => {
    // Create a file that actually starts with MZ header (executable)
    const executableContent = new Uint8Array([0x4D, 0x5A, 0x90, 0x00]); // MZ header
    const file = new File([executableContent], 'fake.pdf', { type: 'application/pdf' });

    const result = await validateFileUploadSecurity(file, {
      enableVirusScanning: true,
      enableMalwareDetection: true,
      enableContentValidation: false,
      maxScanTime: 1000,
    });

    // Should detect MZ header at start
    expect(result.isSecure).toBe(false);
    expect(result.threats).toContain(expect.stringContaining('Windows executable'));
  });

  test('should not flag MZ bytes in PDF content', async () => {
    // Create a PDF that contains MZ bytes in content (not at start)
    const pdfContent = '%PDF-1.4\nSome content with MZ\x4D\x5Abytes inside\n%%EOF';
    const file = new File([pdfContent], 'test.pdf', { type: 'application/pdf' });

    const result = await validateFileUploadSecurity(file, {
      enableVirusScanning: true,
      enableMalwareDetection: true,
      enableContentValidation: false,
      maxScanTime: 1000,
    });

    // Should NOT flag MZ bytes when they're not at the start
    expect(result.threats).not.toContain(expect.stringContaining('Windows executable'));
    expect(result.isSecure).toBe(true);
  });
});
