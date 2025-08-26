/**
 * Test for Turkish character sanitization in filenames
 */

import { sanitizeFilename } from '../inputSanitization';

describe('Turkish Character Sanitization', () => {
  test('should handle Turkish characters correctly', () => {
    const testCases = [
      // Turkish characters
      { input: 'özgeçmiş.pdf', expected: 'ozgecmis.pdf' },
      { input: 'CV_Üçüncü_Kişi.pdf', expected: 'CV_Ucuncu_Kisi.pdf' },
      { input: 'Murat_Şahin_CV.pdf', expected: 'Murat_Sahin_CV.pdf' },
      { input: 'İşçi_CV.pdf', expected: 'Isci_CV.pdf' },
      { input: 'Görüşme_Belgesi.pdf', expected: 'Gorusme_Belgesi.pdf' },
      
      // Mixed characters
      { input: 'Ahmet Çağlar özgeçmiş 2024.pdf', expected: 'Ahmet_Caglar_ozgecmis_2024.pdf' },
      
      // Edge cases
      { input: '', expected: 'file' },
      { input: '....pdf', expected: 'pdf' },
      { input: 'çok_uzun_çok_uzun_çok_uzun_çok_uzun_çok_uzun_çok_uzun_çok_uzun_çok_uzun_çok_uzun_çok_uzun_dosya_ismi.pdf', 
        expected: 'cok_uzun_cok_uzun_cok_uzun_cok_uzun_cok_uzun_cok_uzun_cok_uzun_cok_uzun_cok_uzun_cok_uzun_dosya_' },
      
      // Security test cases
      { input: '../../../etc/passwd', expected: 'etcpasswd' },
      { input: 'normal<script>alert("xss")</script>.pdf', expected: 'normalscriptalert_xss_script.pdf' },
    ];

    testCases.forEach(({ input, expected }) => {
      const result = sanitizeFilename(input);
      
      // For length-limited cases, just check if it starts with expected
      if (expected.length >= 100) {
        expect(result).toHaveLength(100);
        expect(result.startsWith(expected.substring(0, 50))).toBe(true);
      } else {
        expect(result).toBe(expected);
      }
    });
  });

  test('should preserve file extensions', () => {
    const testCases = [
      'özgeçmiş.pdf',
      'CV.PDF', 
      'resume.docx'
    ];

    testCases.forEach(filename => {
      const result = sanitizeFilename(filename);
      const originalExt = filename.split('.').pop()?.toLowerCase();
      const resultExt = result.split('.').pop()?.toLowerCase();
      
      expect(resultExt).toBe(originalExt);
    });
  });

  test('should handle common problematic characters', () => {
    const problematicFile = 'My CV: "Final Version" (2024) - Öğrenci İçin.pdf';
    const result = sanitizeFilename(problematicFile);
    
    // Should not contain problematic characters
    expect(result).not.toMatch(/[<>:"|?*]/);
    expect(result).not.toMatch(/[çğıöşüÇĞIÖŞÜ]/);
    
    // Should be a valid filename
    expect(result.length).toBeGreaterThan(0);
    expect(result).toMatch(/^[a-zA-Z0-9._-]+$/);
  });
});
